package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"
)

type ClusterHealth struct {
	Elasticsearch any    `json:"elasticsearch"`
	Kafka         any    `json:"kafka"`
	K8s           any    `json:"kubernetes"`
	Status        string `json:"status"`
}

// Query a JSON endpoint
func fetchJSON(url string, timeout time.Duration, out any) error {
	client := http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body) // modern replacement for ioutil.ReadAll
	if err != nil {
		return err
	}

	return json.Unmarshal(body, out)
}

// Query Prometheus text endpoint
func fetchRaw(url string, timeout time.Duration) (string, error) {
	client := http.Client{Timeout: timeout}
	resp, err := client.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(b), nil
}

func healthHandler() http.Handler {
	esURL := os.Getenv("ELASTIC_URL")
	kafkaMetricsURL := os.Getenv("KAFKA_METRICS_URL")
	k8sAPI := os.Getenv("K8S_METRICS_API")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		health := ClusterHealth{
			Status: "ok",
		}

		// Elasticsearch cluster health
		var esHealth any
		if err := fetchJSON(esURL+"/_cluster/health", 3*time.Second, &esHealth); err != nil {
			health.Elasticsearch = "down"
			health.Status = "degraded"
		} else {
			health.Elasticsearch = esHealth
		}

		// Kafka Prometheus metrics
		kafkaMetrics, err := fetchRaw(kafkaMetricsURL, 3*time.Second)
		if err != nil {
			health.Kafka = "down"
			health.Status = "degraded"
		} else {
			health.Kafka = map[string]string{
				"raw_metrics": kafkaMetrics,
			}
		}

		// Kubernetes pod metrics
		if k8sAPI != "" {
			var podMetrics any
			if err := fetchJSON(k8sAPI, 3*time.Second, &podMetrics); err == nil {
				health.K8s = podMetrics
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(health)
	})
}
