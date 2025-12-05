package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // allow all origins
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
func loadEnv() {
	_ = godotenv.Load()
}
func main() {
	loadEnv()

	kafkaClient := newKafkaClient()
	defer kafkaClient.Close()
	esClient, err := newElasticsearchClient()
	if err != nil {
		log.Fatalf("failed to create ES client: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/scan", scanHandler(kafkaClient))
	mux.Handle("/health", healthHandler())
	mux.Handle("/scans", scansHandler(esClient))

	handler := cors(mux)
	addr := ":8080"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}

	log.Println("API server listening on", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}
