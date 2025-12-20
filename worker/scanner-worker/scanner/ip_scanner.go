package scanner

import (
	"context"
	"log"
	"time"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/kafka"
	"github.com/projectdiscovery/goflags"
	"github.com/projectdiscovery/naabu/v2/pkg/result"
	"github.com/projectdiscovery/naabu/v2/pkg/runner"
)

func buildOptions(req ScanRequest, factBatcher *batch.Batch[kafka.Fact], signalBatcher *batch.Batch[kafka.Signal]) *runner.Options {
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

			now := time.Now()
			log.Printf("OnResult: %s, %+v", hr.Host, hr.Ports)

			for _, port := range hr.Ports {
				fact := kafka.Fact{
					FactType:   "port_open",
					ScanID:     req.ScanID,
					IP:         hr.Host,
					Port:       port.Port,
					ObservedAt: now,
					Source:     "scanner_worker",
				}
				factBatcher.Add(fact)

				signal := kafka.Signal{
					// SignalID: kafka.NewSignalID(req.ScanID, hr.Host, port.Port, "banner_scan_requested"),
					ScanID: req.ScanID,
					Type:   "banner_scan_requested",
					IP:     hr.Host,
					Port:   port.Port,
				}
				signalBatcher.Add(signal)
			}
		},
	}
}

func RunScan(req ScanRequest, factBatcher *batch.Batch[kafka.Fact], signalBatcher *batch.Batch[kafka.Signal]) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	opts := buildOptions(req, factBatcher, signalBatcher)

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
