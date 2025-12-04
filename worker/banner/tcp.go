package main

import (
	"fmt"
	"net"
	"time"

	"github.com/zmap/zgrab2"
)

// Max bytes to read from unknown services.
// Prevents slowloris draining memory.
const maxReadBytes = 4096

func scanRawTCP(t *zgrab2.ScanTarget) *ServiceScanResult {
	ip := t.IP.String()
	addr := net.JoinHostPort(ip, fmt.Sprintf("%d", t.Port))

	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		return &ServiceScanResult{
			IP:       ip,
			Port:     int(t.Port),
			Protocol: "TCP",
			Meta:     map[string]any{"error": err.Error()},
			RawTCP:   "",
		}
	}
	defer conn.Close()

	// set dl bax matblockax
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	buf := make([]byte, maxReadBytes)
	n, _ := conn.Read(buf)
	banner := string(buf[:n])

	return &ServiceScanResult{
		IP:        ip,
		Port:      int(t.Port),
		Protocol:  "TCP",
		Timestamp: time.Now().Unix(),
		RawTCP:    banner,
		Meta: map[string]any{
			"bytes_read": n,
			"timeout":    "2s",
		},
	}
}
