package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/elasticsearch"
	"github.com/exploravis/worker/common/kafka"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {
	workerCount := 8
	jobQueue := make(chan kafka.Fact, 2000)
	elasticsearchAddress := "http://elasticsearch-cluster-master.elasticsearch.svc:9200"
	index := "scans-stats"

	bulkIndexer := elasticsearch.InitElasticsearchBulkIndexer(elasticsearchAddress, index)

	var wg sync.WaitGroup
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for fact := range jobQueue {
				docID := fmt.Sprintf("%s:%d", fact.IP, fact.Port)
				update := map[string]any{
					// Merge/append latest payload under the FactType
					"doc": map[string]any{
						fact.FactType: fact.Payload,
						"ip":          fact.IP,
						"port":        fact.Port,
					},
					"doc_as_upsert": true, // create if missing
				}

				data, err := json.Marshal(update)
				if err != nil {
					log.Printf("[worker %d] failed to marshal update: %v", id, err)
					continue
				}

				if err := elasticsearch.IndexToESWithID(bulkIndexer, docID, data); err != nil {
					log.Printf("[worker %d] failed to index: %v", id, err)
					continue
				}

				log.Printf("[worker %d] Merged %s fact for %s", id, fact.FactType, docID)
			}
		}(i)
	}

	// Kafka consumer
	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	client, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics("scan.facts"),
		kgo.ConsumerGroup("es-facts-worker"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),

		kgo.RebalanceTimeout(5*time.Second),
		kgo.AutoCommitInterval(1*time.Second),
	)
	if err != nil {
		log.Fatalf("unable to create Kafka client: %v", err)
	}
	defer client.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	log.Println("Starting Kafka fetch loop")
	for {
		fetches := client.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("fetch error: %v", e)
			}
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			for _, record := range p.Records {
				var batch batch.FactBatch
				if err := json.Unmarshal(record.Value, &batch); err != nil {
					log.Printf("invalid message: %v", err)
					continue
				}

				for _, fact := range batch.Facts {
					jobQueue <- fact
				}
			}
		})
	}
}
