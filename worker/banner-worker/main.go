package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/exploravis/worker/banner-worker/producer"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {
	workerCount := 8
	jobQueue := make(chan ServiceScanRequest, 2000)

	log.Println("[INFO] Starting", workerCount, "worker goroutines...")
	for i := 0; i < workerCount; i++ {
		go func(id int) {
			log.Printf("[WORKER %d] Started", id)
			for job := range jobQueue {
				log.Printf("[WORKER %d] Processing job: %s:%s (ScanID: %s)", id, job.IP, job.Port, job.ScanID)
				grabBanner(job)
			}
			log.Printf("[WORKER %d] Exiting", id)
		}(i)
	}

	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	log.Println("[INFO] Initializing Kafka producer with seeds:", seeds)
	producer.InitProducer(seeds)

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.ConsumeTopics("ip_scan_result"),
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
			log.Printf("[INFO] Processing partition %s/%d with %d records", p.Topic, p.Partition, len(p.Records))
			for _, record := range p.Records {
				log.Printf("[INFO] Consumed message %s/%d: %s", record.Topic, record.Partition, string(record.Value))

				var req PortsScanRequest
				if err := json.Unmarshal(record.Value, &req); err != nil {
					log.Printf("[WARN] Bad message: %v", err)
					continue
				}

				ports := strings.Split(req.Ports, ",")
				log.Printf("[INFO] Queueing %d ports for IP %s (ScanID: %s)", len(ports), req.IP, req.ScanID)
				for _, portStr := range ports {
					jobQueue <- ServiceScanRequest{
						ScanID: req.ScanID,
						IP:     req.IP,
						Port:   portStr,
					}
				}
			}
		})
	}
}
