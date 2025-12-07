package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	// "github.com/projectdiscovery/naabu/v2/pkg/port"
	"github.com/exploravis/worker/banner-worker/producer"
	"github.com/twmb/franz-go/pkg/kgo"
)

func main() {

	workerCount := 8
	jobQueue := make(chan ServiceScanRequest, 2000)
	for i := range workerCount {
		go func(id int) {
			for job := range jobQueue {
				grabBanner(job)
			}
		}(i)
	}

	seeds := []string{
		"redpanda-0.redpanda.kafka.svc.cluster.local:9093",
	}

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
		log.Fatalf("unable to create client: %v", err)
	}
	defer cl.Close()

	log.Println("Starting ip_scan_result consumer...")

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

				var req PortsScanRequest
				if err := json.Unmarshal(record.Value, &req); err != nil {
					log.Printf("bad message: %v", err)
					continue
				}
				for _, portStr := range strings.Split(req.Ports, ",") {
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
