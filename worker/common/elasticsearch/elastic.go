package elasticsearch

import (
	"bytes"
	"context"
	"log"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esutil"
)

func InitElasticsearchBulkIndexer(elasticsearchAddress string, index string) esutil.BulkIndexer {
	es, err := elasticsearch.NewClient(elasticsearch.Config{
		Addresses: []string{
			elasticsearchAddress,
		},
	})
	if err != nil {
		log.Fatalf("Error creating ES client: %v", err)
	}
	log.Println("Connected to Elasticsearch cluster")

	bi, err := esutil.NewBulkIndexer(esutil.BulkIndexerConfig{
		Client:        es,
		Index:         index,
		NumWorkers:    4,
		FlushBytes:    8 << 20,
		FlushInterval: 2 * time.Second,
	})
	if err != nil {
		log.Fatalf("Error creating bulk indexer: %v", err)
	}
	return bi

}

func IndexToES(bi esutil.BulkIndexer, data []byte) error {
	log.Println("Indexing to Elasticsearch in bulk")

	return bi.Add(context.Background(), esutil.BulkIndexerItem{
		Action: "index",
		Body:   bytes.NewReader(data),
		OnFailure: func(ctx context.Context, item esutil.BulkIndexerItem, resp esutil.BulkIndexerResponseItem, err error) {
			log.Printf("failed indexing doc: %v, resp: %+v", err, resp)
		},
	})
}

func IndexToESWithID(bi esutil.BulkIndexer, docID string, data []byte) error {

	return bi.Add(context.Background(), esutil.BulkIndexerItem{
		Action:     "update",
		DocumentID: docID,
		Body:       bytes.NewReader(data),

		OnSuccess: func(ctx context.Context, item esutil.BulkIndexerItem, resp esutil.BulkIndexerResponseItem) {

			stats := bi.Stats()
			log.Printf("[ES BULK STATS] added=%d indexed=%d failed=%d inflight=%d created=%d, updated=%d, flushed bytes: %d",
				stats.NumAdded, stats.NumIndexed, stats.NumFailed, stats.NumFlushed, stats.NumCreated, stats.NumUpdated, stats.FlushedBytes)
			log.Printf("[ES BULK SUCCESS] docID=%s result=%s", item.DocumentID, resp.Result)
		},
		OnFailure: func(ctx context.Context, item esutil.BulkIndexerItem, resp esutil.BulkIndexerResponseItem, err error) {
			log.Printf("failed updating doc %s: %v, resp: %+v", docID, err, resp)
		},
	})
}
