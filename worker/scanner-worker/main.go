package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/helpers"
	"github.com/exploravis/worker/common/kafka"
	"github.com/exploravis/worker/scanner-worker/scanner"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {
	workerCount := 8
	jobQueue := make(chan scanner.ScanRequest, 2000)

	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	log.Println("[INFO] Initializing Kafka producer with seeds:", seeds)

	kafka.InitProducer(seeds, "scan.facts")
	kafka.InitSignalProducer(seeds, "scan.signals")

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

	signalBatcher := batch.NewBatch(1000, func(signals []kafka.Signal) {
		out := batch.SignalBatch{
			Schema:     1,
			BatchID:    "idid",
			SignalType: "banner_scan_requested",
			Signals:    signals,
			CreatedAt:  time.Now(),
			// Producer:   "scanner_worker",
		}
		kafka.ProduceSignal(helpers.ToJSON(out))
	})

	go func() {
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			factBatcher.FlushIfStale(500 * time.Millisecond)
			signalBatcher.FlushIfStale(500 * time.Millisecond)
		}
	}()

	for i := 0; i < workerCount; i++ {
		go func(id int) {
			log.Printf("[WORKER %d] Started", id)
			for job := range jobQueue {
				log.Printf("[WORKER %d] Processing job: %s:%+v (ScanID: %s)", id, job.Cidr, job.Ports, job.ScanID)
				scanner.RunScan(job, factBatcher, signalBatcher)
				log.Printf("[WORKER FINISHED] ScanID %s completed.", job.ScanID)
			}
			log.Printf("[WORKER %d] Exiting", id)
		}(i)
	}

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.ConsumeTopics("ip_scan_request"),
		kgo.ConsumerGroup("scanner-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),

		kgo.RebalanceTimeout(5*time.Second),
		kgo.AutoCommitInterval(1*time.Second),
	)

	if err != nil {
		log.Fatalf("[ERROR] Unable to create Kafka client: %v", err)
	}
	defer cl.Close()

	log.Println("[INFO] Kafka consumer started on topic 'ip_scan_request'")

	ctx := context.Background()

	for {
		fetches := cl.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("[ERROR] Kafka fetch error: %v", e)
			}
			time.Sleep(500 * time.Millisecond)
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			log.Printf("[INFO] Processing partition %s/%d with %d records", p.Topic, p.Partition, len(p.Records))
			for _, record := range p.Records {
				log.Printf("[INFO] Consumed message %s/%d: %s", record.Topic, record.Partition, string(record.Value))

				var req scanner.ScanRequest
				if err := json.Unmarshal(record.Value, &req); err != nil {
					log.Printf("[WARN] Bad message: %v", err)
					continue
				}
				print("scan req:", req.ScanID)

				jobQueue <- req
			}
		})
	}
}
