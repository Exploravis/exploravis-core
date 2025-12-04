package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esutil"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ServiceScanResult struct {
	ScanID    string         `json:"scan_id,omitempty"`
	IP        string         `json:"ip"`
	Port      int            `json:"port"`
	Timestamp int64          `json:"timestamp"`
	Protocol  string         `json:"protocol"`
	Service   string         `json:"service,omitempty"`
	Banner    string         `json:"banner,omitempty"`
	TLS       map[string]any `json:"tls,omitempty"`
	HTTP      map[string]any `json:"http,omitempty"`
	SSH       map[string]any `json:"ssh,omitempty"`
	RawTCP    string         `json:"raw_tcp,omitempty"`
	Meta      map[string]any `json:"meta,omitempty"`
}

func main() {
	workerCount := 8
	jobQueue := make(chan ServiceScanResult, 2000)

	es, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{
			"http://elasticsearch-cluster-master.elasticsearch.svc:9200",
		},
	})
	if err != nil {
		log.Fatalf("Error creating ES client: %v", err)
	}
	log.Println("Connected to Elasticsearch cluster")

	bi, err := esutil.NewBulkIndexer(esutil.BulkIndexerConfig{
		Client: es,
		Index:  "scans-000001",
	})
	if err != nil {
		log.Fatalf("Error creating bulk indexer: %v", err)
	}
	defer func() {
		if err := bi.Close(context.Background()); err != nil {
			log.Printf("Error closing bulk indexer: %v", err)
		}
	}()

	for i := range workerCount {
		go func(id int) {
			for job := range jobQueue {
				if err := indexToES(bi, job); err != nil {
					log.Printf("[worker %d] failed to index: %v", id, err)
				}
				log.Printf("Indexed %s:%d successfully", job.IP, job.Port)
			}
		}(i)
	}

	seeds := []string{"redpanda-0.redpanda.kafka.svc.cluster.local:9093"}
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.ConsumeTopics("finished_scan"),
		kgo.ConsumerGroup("es-worker-group"),
		kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()),
	)
	if err != nil {
		log.Fatalf("unable to create client: %v", err)
	}
	defer cl.Close()

	log.Println("Starting Redpanda consumer...")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sig
		log.Println("Shutdown signal received, closing...")
		cancel()
		close(jobQueue)
	}()

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
				var result ServiceScanResult
				if err := json.Unmarshal(record.Value, &result); err != nil {
					log.Printf("invalid message: %v", err)
					continue
				}
				jobQueue <- result
			}
		})
	}
}

func indexToES(bi esutil.BulkIndexer, result ServiceScanResult) error {
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	return bi.Add(context.Background(), esutil.BulkIndexerItem{
		Action: "index",
		Body:   bytes.NewReader(data),
		OnFailure: func(ctx context.Context, item esutil.BulkIndexerItem, resp esutil.BulkIndexerResponseItem, err error) {
			log.Printf("failed indexing doc: %v, resp: %+v", err, resp)
		},
	})
}
