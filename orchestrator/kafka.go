package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

func newKafkaClient() *kgo.Client {
	broker := os.Getenv("KAFKA_BROKER")
	log.Println("Kafka broker:", broker)
	if broker == "" {
		log.Fatal("KAFKA_BROKER not set")
	}

	log.Println("Connecting to kafka broker...")
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(broker),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
	)

	log.Println("Connected")
	if err != nil {
		log.Fatalf("Kafka client error: %v", err)
	}

	return cl
}

func produceScanRequest(cl *kgo.Client, payload []byte) {
	record := &kgo.Record{
		Topic: "ip_scan_request",
		Value: payload,
	}

	log.Println("Producing scan request...")
	cl.Produce(context.Background(), record, func(_ *kgo.Record, err error) {
		if err != nil {
			log.Printf("failed to produce record: %v", err)
		} else {
			log.Println("Scan request produced successfully")
		}
	})
}
