package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/twmb/franz-go/pkg/kgo"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/helpers"
	"github.com/exploravis/worker/common/kafka"
)

func main() {
	godotenv.Load()

	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	if v := os.Getenv("KAFKA_SEEDS"); v != "" {
		seeds = strings.Split(v, ",")
	}

	kafka.InitProducer(seeds, "scan.facts")

	// output batcher
	factBatcher := batch.NewBatch(1000, func(facts []kafka.Fact) {
		out := batch.FactBatch{
			Schema:    1,
			BatchID:   "batch-id-no",
			Facts:     facts,
			CreatedAt: time.Now(),
		}
		kafka.ProduceResult(helpers.ToJSON(out))
	})

	// flush stale batches
	go func() {
		t := time.NewTicker(500 * time.Millisecond)
		defer t.Stop()
		for range t.C {
			factBatcher.FlushIfStale(500 * time.Millisecond)
		}
	}()

	// enricher
	enricher, err := NewEnricher(
		os.Getenv("MAXMIND_CITY_DB"),
		os.Getenv("MAXMIND_ASN_DB"),
	)
	if err != nil {
		log.Fatalf("[FATAL] Enricher init failed: %v", err)
	}
	defer enricher.Close()

	// consumer → scan.facts
	client, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics("scan.facts"),
		kgo.ConsumerGroup("meta-enrich-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		log.Fatalf("[FATAL] Kafka init failed: %v", err)
	}
	defer client.Close()

	log.Println("[READY] Meta Enrichment Worker (port_open -> ip_enrichment)")

	ctx := context.Background()
	jobQueue := make(chan kafka.Fact, 4000)

	// worker pool
	const workers = 8
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for fact := range jobQueue {

				enriched, err := enricher.EnrichIP(fact.IP)

				if err != nil {
					log.Printf("[ERR] worker=%d ip=%s: %v", id, fact.IP, err)
					continue
				}

				out := kafka.Fact{
					FactType:   "ip_enrichment",
					ScanID:     fact.ScanID,
					IP:         fact.IP,
					Port:       fact.Port,
					ObservedAt: time.Now(),
					Source:     "meta-enrich-worker",
					Payload:    helpers.StructToMap(enriched),
				}

				factBatcher.Add(out)
			}
		}(i)
	}

	// consume loop
	for {
		fetches := client.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("[KAFKA] %v", e)
			}
			time.Sleep(500 * time.Millisecond)
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			for _, rec := range p.Records {

				var fb batch.FactBatch
				if err := json.Unmarshal(rec.Value, &fb); err != nil {
					log.Printf("[ERR] bad batch: %v", err)
					continue
				}

				for _, fact := range fb.Facts {
					if fact.FactType != "port_open" {
						continue
					}
					jobQueue <- fact
				}
			}
		})
	}
}
