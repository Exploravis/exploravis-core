package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"

	"github.com/google/uuid"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ScanRequest struct {
	ScanID  string `json:"scan_id"`
	IPRange string `json:"ip_range"`
	Ports   string `json:"ports"`
}

func splitCIDR(cidr string, mask int) ([]string, error) {
	ip, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		log.Printf("[ERROR] Failed to parse CIDR %s: %v", cidr, err)
		return nil, err
	}

	var subnets []string
	ones, bits := ipnet.Mask.Size()
	if mask < ones || mask > bits {
		log.Printf("[WARN] Requested mask %d invalid for CIDR %s, returning original", mask, cidr)
		return []string{cidr}, nil
	}

	numSubnets := 1 << (mask - ones)
	baseIP := ip.Mask(ipnet.Mask)

	for i := 0; i < numSubnets; i++ {
		subIP := make(net.IP, len(baseIP))
		copy(subIP, baseIP)

		for j := len(subIP) - 1; j >= 0; j-- {
			subIP[j] += byte(i >> (8 * uint(len(subIP)-1-j)))
		}
		subnet := &net.IPNet{
			IP:   subIP,
			Mask: net.CIDRMask(mask, bits),
		}
		subnets = append(subnets, subnet.String())
		log.Printf("[INFO] Generated subnet: %s", subnet.String())
	}

	return subnets, nil
}

func scanHandler(kafka *kgo.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("[INFO] Scan handler invoked")
		if r.Method != http.MethodPost {
			log.Printf("[WARN] Invalid HTTP method: %s", r.Method)
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("[ERROR] Failed to read request body: %v", err)
			http.Error(w, "invalid body", 400)
			return
		}

		var req ScanRequest
		if err := json.Unmarshal(body, &req); err != nil {
			log.Printf("[ERROR] Failed to unmarshal JSON: %v", err)
			http.Error(w, "bad json", 400)
			return
		}

		if req.IPRange == "" {
			log.Println("[WARN] Missing ip_range in request")
			http.Error(w, "ip_range required", 400)
			return
		}

		baseScanID := uuid.NewString()
		log.Printf("[INFO] Assigned base scan ID: %s", baseScanID)

		subnets, err := splitCIDR(req.IPRange, 24)
		if err != nil {
			log.Printf("[ERROR] Failed to split CIDR: %v", err)
			http.Error(w, "invalid CIDR", 400)
			return
		}

		for _, subnet := range subnets {
			subReq := req
			subReq.ScanID = uuid.NewString()
			subReq.IPRange = subnet

			msgBytes, err := json.Marshal(subReq)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal subnet scan request for %s: %v", subnet, err)
				continue
			}

			produceScanRequest(kafka, msgBytes)
			log.Printf("[INFO] Produced scan request for subnet %s with ScanID %s", subnet, subReq.ScanID)
		}

		w.WriteHeader(202)
		w.Write([]byte(`{"status":"queued","scan_id":"` + baseScanID + `"}`))
		log.Printf("[INFO] Scan batch queued with base ScanID %s for original range %s", baseScanID, req.IPRange)
	})
}
