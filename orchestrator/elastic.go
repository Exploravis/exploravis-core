package main

import (
	"os"

	"github.com/elastic/go-elasticsearch/v8"
)

func newElasticsearchClient() (*elasticsearch.Client, error) {
	esURL := os.Getenv("ELASTIC_URL")
	if esURL == "" {
		esURL = "http://elasticsearch-cluster-master.elasticsearch.svc:9200"
	}
	return elasticsearch.NewClient(elasticsearch.Config{
		Addresses:         []string{esURL},
		RetryOnStatus:     []int{502, 503, 504},
		MaxRetries:        3,
		EnableDebugLogger: true,
	})
}
