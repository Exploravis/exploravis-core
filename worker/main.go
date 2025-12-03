package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/exploravis/worker/scanner"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {

	workerCount := 8
	jobQueue := make(chan scanner.ScanRequest, 2000)

	// Start worker pool
	for i := range workerCount {
		go func(id int) {
			for job := range jobQueue {
				scanner.RunScan(job)
			}
		}(i)
	}

	// init kafka(redpanda) client
	seeds := []string{
		"redpanda-0.redpanda.kafka.svc.cluster.local:9093",
	}

	scanner.InitProducer(seeds)

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.ConsumeTopics("ip_scan_request"),
		kgo.ConsumerGroup("scanner-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		log.Fatalf("unable to create client: %v", err)
	}
	defer cl.Close()

	log.Println("Starting consumer...")

	ctx := context.Background()

	for {
		fetches := cl.PollFetches(ctx)
		if errs := fetches.Errors(); len(errs) > 0 {
			for _, e := range errs {
				log.Printf("fetch error: %v", e)
			}
			continue
		}

		fetches.EachPartition(func(p kgo.FetchTopicPartition) {
			for _, record := range p.Records {

				log.Printf(
					"Consumed message %s/%d: %s",
					record.Topic, record.Partition, string(record.Value),
				)

				var req scanner.ScanRequest
				if err := json.Unmarshal(record.Value, &req); err != nil {
					log.Printf("bad message: %v", err)
					continue
				}

				// Push job into worker queue (backpressure-controlled)
				jobQueue <- req
			}
		})
	}
}
