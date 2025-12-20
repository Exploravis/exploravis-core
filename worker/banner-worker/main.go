package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/helpers"
	"github.com/exploravis/worker/common/kafka"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {
	workerCount := 8
	jobQueue := make(chan ServiceScanRequest, 2000)
	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}

	log.Println("[INFO] Initializing Kafka producer with seeds:", seeds)

	kafka.InitProducer(seeds, "scan.facts")
	// kafka.InitSignalProducer(seeds, "scan.signals")

	factBatcher := batch.NewBatch(1000, func(facts []kafka.Fact) {
		out := batch.FactBatch{
			Schema:    1,
			BatchID:   "dfsf",
			Facts:     facts,
			CreatedAt: time.Now(),
			// Producer:  "scanner_worker",
		}
		kafka.ProduceResult(helpers.ToJSON(out))
	})

	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			factBatcher.FlushIfStale(500 * time.Millisecond)
		}
	}()

	for i := 0; i < workerCount; i++ {
		go func(id int) {
			log.Printf("[WORKER %d] Started", id)
			for job := range jobQueue {
				log.Printf("[WORKER %d] Processing job: %s:%d (ScanID: %s)", id, job.IP, job.Port, job.ScanID)
				grabBanner(job, factBatcher)
			}
			log.Printf("[WORKER %d] Exiting", id)
		}(i)
	}

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.ConsumeTopics("scan.signals"),
		kgo.ConsumerGroup("banner-scanner-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)

	if err != nil {
		log.Fatalf("[ERROR] Unable to create Kafka client: %v", err)
	}
	defer cl.Close()
	log.Println("[INFO] Kafka consumer started on topic 'ip_scan_result'")

	ctx := context.Background()

	for {
		fetches := cl.PollFetches(ctx)

		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("[ERROR] Kafka fetch error: %v", e)
			}
			time.Sleep(1 * time.Second)
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			for _, record := range p.Records {
				var batch batch.SignalBatch
				if err := json.Unmarshal(record.Value, &batch); err != nil {
					continue
				}
				for _, signal := range batch.Signals {
					if signal.Type != "banner_scan_requested" {
						continue
					}
					jobQueue <- ServiceScanRequest{
						ScanID: signal.ScanID,
						IP:     signal.IP,
						Port:   signal.Port,
					}
				}
			}
		})
	}
}
