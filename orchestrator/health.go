package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ClusterHealth struct {
	Elasticsearch any    `json:"elasticsearch"`
	Kafka         any    `json:"kafka"`
	K8s           any    `json:"kubernetes"`
	Status        string `json:"status"`
}

func doGet(url string, timeout time.Duration, headers map[string]string, transport *http.Transport) (*http.Response, error) {
	client := &http.Client{Timeout: timeout}
	if transport != nil {
		client.Transport = transport
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	return client.Do(req)
}

func fetchJSONWithClient(url string, timeout time.Duration, headers map[string]string, transport *http.Transport, out any) error {
	resp, err := doGet(url, timeout, headers, transport)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func fetchRawWithClient(url string, timeout time.Duration, headers map[string]string, transport *http.Transport) (string, error) {
	resp, err := doGet(url, timeout, headers, transport)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func checkElasticsearch(base string) (any, error) {
	if base == "" {
		return nil, fmt.Errorf("ELASTIC_URL unset")
	}
	u := strings.TrimRight(base, "/") + "/_cluster/health?pretty=false"
	var out any
	if err := fetchJSONWithClient(u, 3*time.Second, nil, nil, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func checkKafkaDetailed(broker string) (any, error) {
	if broker == "" {
		return nil, fmt.Errorf("KAFKA_BROKER unset")
	}

	seeds := []string{broker}
	cl, err := kgo.NewClient(
		kgo.SeedBrokers(seeds...),
		kgo.AllowAutoTopicCreation(),
	)
	if err != nil {
		return nil, err
	}
	defer cl.Close()

	admin := kadm.NewClient(cl)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	topicsMeta, err := admin.ListTopics(ctx)
	if err != nil {
		return nil, err
	}

	groups, err := admin.ListGroups(ctx)
	if err != nil {
		return nil, err
	}

	topics := make([]map[string]any, 0)
	for name, meta := range topicsMeta {
		t := map[string]any{
			"name":       name,
			"partitions": len(meta.Partitions),
			"replicas":   meta.Partitions[0].Replicas,
		}
		topics = append(topics, t)
	}

	consumerGroups := make([]map[string]any, 0)
	for _, g := range groups {
		consumerGroups = append(consumerGroups, map[string]any{
			"group":         g.Group,
			"state":         g.State,
			"coordinator":   g.Coordinator,
			"protocol_type": g.ProtocolType,
		})
	}

	return map[string]any{
		"topics":          topics,
		"consumer_groups": consumerGroups,
	}, nil
}
func checkKafka(metricsURL string) (any, error) {
	if metricsURL == "" {
		return nil, fmt.Errorf("KAFKA_METRICS_URL unset")
	}
	raw, err := fetchRawWithClient(metricsURL, 10*time.Second, nil, nil)
	if err != nil {
		return nil, err
	}
	snippet := raw
	if len(snippet) > 500 {
		snippet = snippet[:500]
	}
	if strings.TrimSpace(raw) == "" {
		return nil, fmt.Errorf("empty metrics")
	}
	return map[string]any{"metrics_snippet": snippet}, nil
}

func checkKubernetes(apiURL string) (any, error) {
	if apiURL == "" {
		apiURL = "https://kubernetes.default.svc"
	}
	headers := map[string]string{}
	var transport *http.Transport

	token := os.Getenv("K8S_BEARER_TOKEN")
	if token == "" {
		if b, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token"); err == nil {
			token = string(b)
		}
	}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}

	caPath := os.Getenv("K8S_CA_PATH")
	if caPath == "" {
		defaultPath := "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
		if _, err := os.Stat(defaultPath); err == nil {
			caPath = defaultPath
		}
	}

	if caPath != "" {
		b, err := os.ReadFile(caPath)
		if err != nil {
			return nil, fmt.Errorf("failed loading CA: %w", err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(b) {
			return nil, fmt.Errorf("failed to parse CA file")
		}
		transport = &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool}}
	}

	u := strings.TrimRight(apiURL, "/")
	tryURLs := []string{u + "/healthz", u + "/readyz", u}

	var lastErr error
	for _, candidate := range tryURLs {
		var out any
		if err := fetchJSONWithClient(candidate, 10*time.Second, headers, transport, &out); err == nil {
			nodes, nErr := getClusterNodes(u, token, caPath)
			if nErr != nil {
				return map[string]any{"api": out, "nodes_error": nErr.Error()}, nil
			}
			return map[string]any{"api": out, "nodes": nodes}, nil
		} else {
			if raw, rErr := fetchRawWithClient(candidate, 10*time.Second, headers, transport); rErr == nil {
				nodes, nErr := getClusterNodes(u, token, caPath)
				if nErr != nil {
					return map[string]any{"status": "ok", "message": raw, "nodes_error": nErr.Error()}, nil
				}
				return map[string]any{"status": "ok", "message": raw, "nodes": nodes}, nil
			}
			lastErr = err
		}
	}
	return nil, lastErr
}

func healthHandler() http.Handler {
	k8sAPI := os.Getenv("K8S_METRICS_API")

	esURL := os.Getenv("ELASTIC_URL")
	if esURL == "" {
		esURL = "http://elasticsearch-cluster-master.elasticsearch.svc:9200"
	}

	kafkaMetricsURL := os.Getenv("KAFKA_BROKER_METRICS")
	if kafkaMetricsURL == "" {
		kafkaMetricsURL = "http://redpanda.kafka.svc.cluster.local:9644/metrics"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := ClusterHealth{Status: "ok"}
		upCount := 0
		downCount := 0
		unknownCount := 0
		total := 0

		total++
		if out, err := checkElasticsearch(esURL); err != nil {
			h.Elasticsearch = map[string]any{"status": "down", "error": err.Error()}
			downCount++
		} else {
			h.Elasticsearch = out
			upCount++
		}

		total++
		if out, err := checkKafkaDetailed(os.Getenv("KAFKA_BROKER")); err != nil {
			h.Kafka = map[string]any{"status": "down", "error": err.Error()}
			downCount++
		} else {
			h.Kafka = out
			upCount++
		}
		if out, err := checkKubernetes(k8sAPI); err != nil {
			h.K8s = map[string]any{"status": "down", "error": err.Error()}
			downCount++
		} else {
			h.K8s = out
			upCount++
		}

		if downCount == total {
			h.Status = "down"
			w.WriteHeader(http.StatusServiceUnavailable)
		} else if downCount > 0 || unknownCount > 0 {
			h.Status = "degraded"
		} else {
			h.Status = "ok"
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(h)
	})
}
