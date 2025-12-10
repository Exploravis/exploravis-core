package scanner

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/projectdiscovery/goflags"
	"github.com/projectdiscovery/naabu/v2/pkg/port"
	"github.com/projectdiscovery/naabu/v2/pkg/result"
	"github.com/projectdiscovery/naabu/v2/pkg/runner"
)

type ScanRequest struct {
	ScanID string `json:"scan_id"`
	Cidr   string `json:"ip_range"`
	Ports  string `json:"ports"`
}

type ScanResult struct {
	ScanID string `json:"scan_id"`
	Host   string `json:"host"`
	Ports  string `json:"ports"`
	Time   int64  `json:"timestamp"`
}

func portsToString(ports []*port.Port) string {

	if len(ports) == 0 {
		return ""
	}

	out := make([]string, 0, len(ports))
	for _, p := range ports {
		out = append(out, strconv.Itoa(p.Port))
	}
	return strings.Join(out, ",")
}

func buildOptions(req ScanRequest) *runner.Options {
	return &runner.Options{
		Host:     goflags.StringSlice{req.Cidr},
		Ports:    req.Ports,
		ScanType: "c",

		Rate:    500,
		Retries: 1,

		Timeout:           2000,
		EnableProgressBar: false,
		Verbose:           false,
		Threads:           10,
		Stream:            true,
		OnResult: func(hr *result.HostResult) {
			println("OS FINGERPRINT:", hr.OS)
			msg := ScanResult{
				ScanID: req.ScanID,
				Host:   hr.Host,
				Ports:  portsToString(hr.Ports),
				Time:   time.Now().Unix(),
			}

			value, err := json.Marshal(msg)
			if err != nil {
				// log.Printf("marshal error: %v", err)
				return
			}

			// fmt.Printf("[RESULT] %s -> %+v, ", hr.Host, hr.Ports)
			ProduceResult(value)

		},
	}
}

func RunScan(req ScanRequest) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	opts := buildOptions(req)

	r, err := runner.NewRunner(opts)
	if err != nil {
		log.Printf("failed to create naabu runner: %v", err)
		return
	}

	log.Printf("Naabu runner created succ")
	defer r.Close()

	r.RunEnumeration(ctx)
	log.Printf("[WORKER FINISHED] ScanID %s completed.", req.ScanID)
}
