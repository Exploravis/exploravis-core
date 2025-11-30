package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
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
