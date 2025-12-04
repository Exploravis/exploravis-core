package producer

import (
	"context"
	"log"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

var producer *kgo.Client

func InitProducer(brokers []string) {
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.DefaultProduceTopic("finished_scan"),
	)
	if err != nil {
		log.Fatalf("failed to create results producer: %v", err)
	}

	producer = cl
	log.Println("Result producer initialized")
}

func CloseProducer() {
	if producer != nil {
		producer.Close()
	}
}

func ProduceResult(value []byte) {
	if producer == nil {
		log.Printf("producer not initialized, dropping message")
		return
	}

	record := &kgo.Record{
		Value: value,
	}

	producer.Produce(context.Background(), record, func(_ *kgo.Record, err error) {
		if err != nil {
			log.Printf("failed to deliver scan result: %v", err)
		}
	})
}
