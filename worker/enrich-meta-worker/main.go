package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/exploravis/worker/enrich-meta-worker/producer"
)

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
