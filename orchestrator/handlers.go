package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/google/uuid"

	"github.com/twmb/franz-go/pkg/kgo"
)

type ScanRequest struct {
	ScanID  string `json:"scan_id"`
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

		// Generate scan_id
		req.ScanID = uuid.NewString()

		// rematshel again
		msgBytes, err := json.Marshal(req)
		if err != nil {
			http.Error(w, "failed to marshal scan request", 500)
			return
		}

		produceScanRequest(kafka, msgBytes)

		w.WriteHeader(202)
		w.Write([]byte(`{"status":"queued","scan_id":"` + req.ScanID + `"}`))
	})
}
