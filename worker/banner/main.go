package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"strconv"
	"strings"
	"time"

	// "github.com/projectdiscovery/naabu/v2/pkg/port"
	"github.com/exploravis/worker/banner/producer"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/zmap/zgrab2"
)

func grabBanner(s ServiceScanRequest) ServiceScanResult {
	portNum, err := strconv.Atoi(s.Port)
	if err != nil {
		return ServiceScanResult{
			IP:   s.IP,
			Port: 0,
			Meta: map[string]any{"error": "invalid port"},
		}
	}

	target := &zgrab2.ScanTarget{
		IP:   net.ParseIP(s.IP),
		Port: uint(portNum),
	}

	if target.IP == nil {
		return ServiceScanResult{
			IP:   s.IP,
			Port: portNum,
			Meta: map[string]any{"error": "invalid IP format"},
		}
	}

	var result *ServiceScanResult

	switch portNum {

	// HTTP family
	case 80, 8080, 8000:
		result = scanHTTP(target)

	// HTTPS
	case 443:
		result = scanHTTPS(target)

	case 21:
		result = scanFTP(target)

	case 22:
		result = scanSSH(target)

	default:
		result = scanRawTCP(target)
	}

	// this shouldn't happen
	if result == nil {
		return ServiceScanResult{
			IP:   s.IP,
			Port: portNum,
			Meta: map[string]any{"error": "scan failed or timed out"},
		}
	}

	b, err := json.MarshalIndent(result, "", " ")
	if err != nil {
		log.Println("marshal error:", err)
	} else {
		log.Println("==========================")
		log.Println(string(b))
	}

	value, err := json.Marshal(result)
	if err != nil {
		log.Printf("marshal error: %v", err)
		return ServiceScanResult{}
	}
	producer.ProduceResult(value)

	return *result
}

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
						IP:   req.IP,
						Port: portStr,
					}
				}

			}
		})
	}

}
