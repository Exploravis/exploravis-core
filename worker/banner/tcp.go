package main

import (
	"fmt"
	"net"
	"time"

	"github.com/zmap/zgrab2"
)

const maxReadBytes = 4096

func scanRawTCP(t *zgrab2.ScanTarget) *ServiceScanResult {
	const (
		readTimeout  = 2 * time.Second
		maxReadBytes = 4096
		maxStore     = 512
	)

	ip := t.IP.String()
	addr := net.JoinHostPort(ip, fmt.Sprintf("%d", t.Port))

	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		return &ServiceScanResult{
			IP:       ip,
			Port:     int(t.Port),
			Protocol: "TCP",
			Meta:     map[string]any{"error": err.Error()},
			Banner:   "",
		}
	}
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))

	buf := make([]byte, maxReadBytes)
	n, _ := conn.Read(buf)

	if n <= 0 {
		return &ServiceScanResult{
			IP:        ip,
			Port:      int(t.Port),
			Protocol:  "TCP",
			Timestamp: time.Now().Unix(),
			Banner:    "",
			Meta: map[string]any{
				"bytes_read": n,
				"timeout":    readTimeout.String(),
			},
		}
	}

	raw := buf[:n]

	banner := sanitizeBanner(raw)

	if len(banner) > maxStore {
		banner = banner[:maxStore]
	}

	return &ServiceScanResult{
		IP:        ip,
		Port:      int(t.Port),
		Protocol:  "TCP",
		Timestamp: time.Now().Unix(),
		Banner:    banner,
		RawTCP:    banner,
		Meta: map[string]any{
			"bytes_read": n,
			"timeout":    readTimeout.String(),
		},
	}
}

func sanitizeBanner(b []byte) string {
	out := make([]byte, 0, len(b))
	for _, c := range b {
		if c >= 9 && c <= 126 {
			out = append(out, c)
		} else {
			out = append(out, '.')
		}
	}
	return string(out)
}
