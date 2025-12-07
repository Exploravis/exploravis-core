package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/oschwald/geoip2-golang"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/exploravis/worker/enrich-meta-worker/producer"
)

type ServiceScanResult struct {
	ScanID    string         `json:"scan_id,omitempty"`
	IP        string         `json:"ip"`
	Port      int            `json:"port"`
	Timestamp int64          `json:"timestamp"`
	Protocol  string         `json:"protocol"`
	Service   string         `json:"service,omitempty"`
	Banner    string         `json:"banner,omitempty"`
	TLS       map[string]any `json:"tls,omitempty"`
	HTTP      map[string]any `json:"http,omitempty"`
	SSH       map[string]any `json:"ssh,omitempty"`
	RawTCP    string         `json:"raw_tcp,omitempty"`
	Meta      map[string]any `json:"meta,omitempty"`
}

type ttlCache struct {
	mu    sync.Mutex
	items map[string]cacheEntry
	ttl   time.Duration
}

type cacheEntry struct {
	value   string
	expires time.Time
}

func newTTLCache(ttl time.Duration) *ttlCache {
	return &ttlCache{
		items: make(map[string]cacheEntry),
		ttl:   ttl,
	}
}

func (c *ttlCache) Get(k string) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.items[k]; ok {
		if time.Now().Before(e.expires) {
			return e.value, true
		}
		delete(c.items, k)
	}
	return "", false
}

func (c *ttlCache) Set(k, v string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[k] = cacheEntry{
		value:   v,
		expires: time.Now().Add(c.ttl),
	}
}

// Cached IP metadata
type cachedIPMeta struct {
	Geo      map[string]any
	ASN      map[string]any
	Hostname string
	Expires  time.Time
}

// Enricher with per-IP cache
type Enricher struct {
	geoDB   *geoip2.Reader
	asnDB   *geoip2.Reader
	rdns    *ttlCache
	ipCache map[string]cachedIPMeta
	mu      sync.RWMutex
	ttl     time.Duration
}

func NewEnricher(geoPath, asnPath string) (*Enricher, error) {
	log.Printf("[INIT] Loading Geo DB: %s", geoPath)
	geoDB, err := geoip2.Open(geoPath)
	if err != nil {
		return nil, err
	}

	log.Printf("[INIT] Loading ASN DB: %s", asnPath)
	asnDB, err := geoip2.Open(asnPath)
	if err != nil {
		log.Printf("[WARN] Failed to load ASN DB: %v", err)
		asnDB = nil
	}

	return &Enricher{
		geoDB:   geoDB,
		asnDB:   asnDB,
		rdns:    newTTLCache(24 * time.Hour),
		ipCache: make(map[string]cachedIPMeta),
		ttl:     24 * time.Hour,
	}, nil
}

func (e *Enricher) Close() {
	if e.geoDB != nil {
		e.geoDB.Close()
	}
	if e.asnDB != nil {
		e.asnDB.Close()
	}
}

func (e *Enricher) reverseDNS(ip string) (string, error) {
	if v, ok := e.rdns.Get(ip); ok {
		return v, nil
	}
	names, err := net.LookupAddr(ip)
	if err != nil || len(names) == 0 {
		return "", err
	}
	name := strings.TrimSuffix(names[0], ".")
	e.rdns.Set(ip, name)
	return name, nil
}

func (e *Enricher) geoASNLookup(ip string) (map[string]any, map[string]any) {
	geo := map[string]any{}
	asn := map[string]any{}

	parsed := net.ParseIP(ip)
	if parsed == nil {
		log.Printf("[ERROR] Invalid IP for Geo/ASN lookup: %s", ip)
		return geo, asn
	}

	if e.geoDB != nil {
		rec, err := e.geoDB.City(parsed)
		if err == nil {
			geo["country"] = rec.Country.IsoCode
			geo["city"] = rec.City.Names["en"]
			geo["location"] = map[string]float64{
				"lat": rec.Location.Latitude,
				"lon": rec.Location.Longitude,
			}
		}
	}

	if e.asnDB != nil {
		rec, err := e.asnDB.ASN(parsed)
		if err == nil {
			asn["number"] = rec.AutonomousSystemNumber
			asn["org"] = rec.AutonomousSystemOrganization
		}
	}

	return geo, asn
}

// Cached lookup per IP
func (e *Enricher) lookupIPMeta(ip string) (geo, asn map[string]any, hostname string) {
	now := time.Now()
	e.mu.RLock()
	if meta, ok := e.ipCache[ip]; ok && meta.Expires.After(now) {
		e.mu.RUnlock()
		return meta.Geo, meta.ASN, meta.Hostname
	}
	e.mu.RUnlock()

	geo, asn = e.geoASNLookup(ip)
	hn, _ := e.reverseDNS(ip)

	e.mu.Lock()
	e.ipCache[ip] = cachedIPMeta{
		Geo:      geo,
		ASN:      asn,
		Hostname: hn,
		Expires:  now.Add(e.ttl),
	}
	e.mu.Unlock()

	return geo, asn, hn
}

func (e *Enricher) enrichMessage(src ServiceScanResult) (ServiceScanResult, error) {
	out := src
	if out.Meta == nil {
		out.Meta = map[string]any{}
	}

	log.Printf("[PROCESS] Enriching %s:%d", out.IP, out.Port)

	geo, asn, hn := e.lookupIPMeta(out.IP)

	if len(geo) > 0 {
		out.Meta["geo"] = geo
	}
	if len(asn) > 0 {
		out.Meta["asn"] = asn
	}
	if hn != "" {
		out.Meta["hostname"] = hn
	}

	return out, nil
}

func main() {
	godotenv.Load()
	seedsEnv := os.Getenv("KAFKA_SEEDS")
	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	if seedsEnv != "" {
		seeds = strings.Split(seedsEnv, ",")
	}

	producer.InitProducer(seeds)

	geoPath := os.Getenv("MAXMIND_CITY_DB")
	asnPath := os.Getenv("MAXMIND_ASN_DB")
	log.Println("MAXMIND_CITY_DB:", geoPath)
	log.Println("MAXMIND_ASN_DB:", asnPath)

	enricher, err := NewEnricher(geoPath, asnPath)
	if err != nil {
		log.Fatalf("[FATAL] Enricher init failed: %v", err)
	}
	defer enricher.Close()

	client, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics("not_enriched_finished_scan"),
		kgo.ConsumerGroup("meta-enrich-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		log.Fatalf("[FATAL] Kafka init failed: %v", err)
	}
	defer client.Close()

	log.Println("[READY] Metadata Enrichment Worker Running...")

	ctx := context.Background()

	for {
		fetches := client.PollFetches(ctx)

		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("[KAFKA][ERR] %v", e)
			}
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			for _, rec := range p.Records {

				var src ServiceScanResult
				if err := json.Unmarshal(rec.Value, &src); err != nil {
					log.Printf("[ERROR] Invalid message: %v", err)
					continue
				}

				log.Println("ScanID:", src.ScanID)

				enriched, err := enricher.enrichMessage(src)
				if err != nil {
					log.Printf("[ERROR] Enrichment failed: %v", err)
					continue
				}

				bytes, _ := json.Marshal(enriched)
				producer.ProduceResult(bytes)

				log.Printf("[DONE] Enriched %s:%d", src.IP, src.Port)
			}
		})
	}
}
