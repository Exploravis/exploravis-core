package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/twmb/franz-go/pkg/kgo"
)

type ScanRequest struct {
	ScanID  string `json:"scan_id"`
	IPRange string `json:"ip_range"`
	Ports   string `json:"ports"`
}

// parsePorts accepts CSV and ranges (e.g. "80,443,8000-8010,1-1024")
// returns a deduplicated, sorted slice of ints
func parsePorts(portsStr string) ([]int, error) {
	set := make(map[int]struct{})
	for _, part := range strings.Split(portsStr, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if strings.Contains(part, "-") {
			bounds := strings.SplitN(part, "-", 2)
			if len(bounds) != 2 {
				continue
			}
			a, err1 := strconv.Atoi(strings.TrimSpace(bounds[0]))
			b, err2 := strconv.Atoi(strings.TrimSpace(bounds[1]))
			if err1 != nil || err2 != nil {
				continue
			}
			if a > b {
				a, b = b, a
			}
			for p := a; p <= b; p++ {
				if p > 0 && p <= 65535 {
					set[p] = struct{}{}
				}
			}
		} else {
			p, err := strconv.Atoi(part)
			if err != nil {
				continue
			}
			if p > 0 && p <= 65535 {
				set[p] = struct{}{}
			}
		}
	}

	ports := make([]int, 0, len(set))
	for p := range set {
		ports = append(ports, p)
	}
	// sort for determinism
	sortInts(ports)
	return ports, nil
}

func sortInts(a []int) {
	if len(a) > 1 {
		sort.Ints(a)
	}
}

// chunkPorts splits slice of ports into chunks of size chunkSize.
// returns a slice of string representations ("80,443,...")
func chunkPorts(ports []int, chunkSize int) []string {
	if chunkSize <= 0 {
		chunkSize = 20
	}
	var chunks []string
	for i := 0; i < len(ports); i += chunkSize {
		end := i + chunkSize
		if end > len(ports) {
			end = len(ports)
		}
		sub := ports[i:end]
		parts := make([]string, 0, len(sub))
		for _, p := range sub {
			parts = append(parts, strconv.Itoa(p))
		}
		chunks = append(chunks, strings.Join(parts, ","))
	}
	return chunks
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
	// read chunk size from env, default 20
	chunkSize := 20
	if s := os.Getenv("PORT_CHUNK_SIZE"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 {
			chunkSize = v
		}
	}

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
		// if ports missing, default to "80"
		if strings.TrimSpace(req.Ports) == "" {
			req.Ports = "80"
		}

		// base parent id
		baseScanID := uuid.NewString()
		log.Printf("[INFO] Assigned base scan ID: %s", baseScanID)

		// parse and chunk ports
		ports, err := parsePorts(req.Ports)
		if err != nil {
			log.Printf("[ERROR] Failed to parse ports: %v", err)
			http.Error(w, "invalid ports", 400)
			return
		}
		portChunks := chunkPorts(ports, chunkSize)
		log.Printf("[DEBUG] Port chunks: %d (chunk size=%d)", len(portChunks), chunkSize)

		// split to /24 subnets
		subnets, err := splitCIDR(req.IPRange, 24)
		if err != nil {
			log.Printf("[ERROR] Failed to split CIDR: %v", err)
			http.Error(w, "invalid CIDR", 400)
			return
		}

		// produce one message per (subnet, portChunk)
		for _, subnet := range subnets {
			for _, portsChunk := range portChunks {
				subReq := ScanRequest{
					ScanID:  baseScanID,
					IPRange: subnet,
					Ports:   portsChunk,
				}

				msgBytes, err := json.Marshal(subReq)
				if err != nil {
					log.Printf("[ERROR] Failed to marshal sub request: %v", err)
					continue
				}
				produceScanRequest(kafka, msgBytes, subReq.IPRange)
			}
		}

		w.WriteHeader(202)
		w.Write([]byte(`{"status":"queued","scan_id":"` + baseScanID + `"}`))
		log.Printf("[INFO] Scan batch queued with base ScanID %s for original range %s", baseScanID, req.IPRange)
	})
}
