package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/twmb/franz-go/pkg/kgo"
)

type ScanRequest struct {
	IPRange string `json:"ip_range"`
	Ports   string `json:"ports"`
}

func scanHandler(kafka *kgo.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Scan handler invoked...")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		log.Println("Method:", r.Method)

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "invalid body", 400)
			return
		}

		var req ScanRequest
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "bad json", 400)
			return
		}

		if req.IPRange == "" {
			http.Error(w, "ip_range required", 400)
			return
		}

		produceScanRequest(kafka, body)

		w.WriteHeader(202)
		w.Write([]byte(`{"status":"queued"}`))
	})
}
