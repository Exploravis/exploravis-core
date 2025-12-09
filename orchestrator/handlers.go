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
		// log.Printf("[WARN] Requested mask %d invalid for CIDR %s, returning original", mask, cidr)
		return []string{cidr}, nil
	}

	current := ip.Mask(ipnet.Mask)
	broadcast := lastIP(ipnet)

	for cmpIP(current, broadcast) <= 0 {
		subnet := &net.IPNet{
			IP:   current,
			Mask: net.CIDRMask(mask, bits),
		}
		subnets = append(subnets, subnet.String())
		// log.Printf("[INFO] Generated subnet: %s", subnet.String())
		current = nextSubnet(current, mask)
	}

	return subnets, nil
}

func lastIP(n *net.IPNet) net.IP {
	ip := n.IP.To4()
	mask := n.Mask
	last := make(net.IP, len(ip))
	for i := 0; i < len(ip); i++ {
		last[i] = ip[i] | ^mask[i]
	}
	return last
}

func cmpIP(a, b net.IP) int {
	for i := 0; i < len(a); i++ {
		if a[i] < b[i] {
			return -1
		}
		if a[i] > b[i] {
			return 1
		}
	}
	return 0
}

func nextSubnet(ip net.IP, mask int) net.IP {
	ip = ip.To4()
	increment := 1 << (32 - mask)
	newIP := make(net.IP, 4)
	copy(newIP, ip)
	for i := 3; i >= 0; i-- {
		newIP[i] += byte(increment & 0xFF)
		increment >>= 8
	}
	return newIP
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
		req.ScanID = baseScanID
		log.Printf("[INFO] Assigned base scan ID: %s", baseScanID)

		subnets, err := splitCIDR(req.IPRange, 24)
		if err != nil {
			log.Printf("[ERROR] Failed to split CIDR: %v", err)
			http.Error(w, "invalid CIDR", 400)
			return
		}

		for _, subnet := range subnets {
			subReq := req
			subReq.IPRange = subnet

			msgBytes, err := json.Marshal(subReq)
			if err != nil {
				// log.Printf("[ERROR] Failed to marshal subnet scan request for %s: %v", subnet, err)
				continue
			}

			produceScanRequest(kafka, msgBytes)
			// log.Printf("[INFO] Produced scan request for subnet %s with ScanID %s", subnet, baseScanID)
		}

		w.WriteHeader(202)
		w.Write([]byte(`{"status":"queued","scan_id":"` + baseScanID + `"}`))
		log.Printf("[INFO] Scan batch queued with base ScanID %s for original range %s", baseScanID, req.IPRange)
	})
}
