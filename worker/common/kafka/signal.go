package kafka

import (
	"context"
	"log"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

var signal_producer *kgo.Client

func InitSignalProducer(brokers []string, signalTopic string) {
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.DialTimeout(5*time.Second),
		kgo.ProduceRequestTimeout(5*time.Second),
		kgo.DefaultProduceTopic(signalTopic),
		kgo.RecordPartitioner(kgo.RoundRobinPartitioner()),
	)
	if err != nil {
		log.Fatalf("failed to create results producer: %v", err)
	}

	signal_producer = cl
	log.Println("Result producer initialized")
}

func ProduceSignal(value []byte) {

	if signal_producer == nil {
		log.Printf("producer not initialized, dropping message")
		return
	}

	record := &kgo.Record{
		Value: value,
	}

	signal_producer.Produce(context.Background(), record, func(_ *kgo.Record, err error) {
		if err != nil {
			log.Printf("failed to deliver scan result: %v", err)
		}
	})
	log.Printf("signal produced successfully")
}
