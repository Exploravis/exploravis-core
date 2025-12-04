package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/twmb/franz-go/pkg/kgo"
)

func IsAlive(url string, timeout time.Duration) bool {
	client := http.Client{
		Timeout: timeout,
	}
	resp, err := client.Head(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300

}
func main() {
	seeds := []string{
		"redpanda-0.redpanda.kafka.svc.cluster.local:9093",
		// "redpanda-1.redpanda.kafka.svc.cluster.local:9093",
		// "redpanda-2.redpanda.kafka.svc.cluster.local:9093",
	}

	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
	)
	if err != nil {
		log.Fatalf("unable to create client: %v", err)
	}
	defer cl.Close()

	log.Println("Sending a test request in ip_scan_request topic")
	test_scan_req := []byte(`{"ip_range": "192.168.1.1/24", "ports": "80,8080,443,22,23,21,20,53,554,8000,8888,8443,5000,37777"}`)
	record := &kgo.Record{
		Topic: "ip_scan_request",
		Value: test_scan_req,
	}

	if err := cl.ProduceSync(context.Background(), record).FirstErr(); err != nil {
		log.Fatalf("produce error: %v", err)
	}

	log.Println("Message produced successfully")

	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found")
	}

	kafkaBroker := os.Getenv("KAFKA_BROKER")
	if kafkaBroker == "" {
		log.Println("KAFKA_BROKER is not set")
	}

	elasticURL := os.Getenv("ELASTIC_URL")
	if elasticURL == "" {
		log.Println("ELASTIC_URL is not set")
	}
	fmt.Println("Starting ...")
	fmt.Println("Elasticsearch url endpoint:", elasticURL)
	fmt.Println("kafka url endpoint:", kafkaBroker)

	if IsAlive(elasticURL, 5*time.Second) {
		fmt.Println("Elasticsearch is alive")
	} else {
		fmt.Println("Elasticsearch returned non-OK status")
	}

	select {}
}
