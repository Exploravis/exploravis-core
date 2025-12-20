package main

import (
	"fmt"
	"net"
	"time"

	"github.com/zmap/zgrab2"
)

const maxReadBytes = 4096

func scanRawTCP(t *zgrab2.ScanTarget) *ServiceScanResult {
	if t == nil || t.IP == nil {
		return nil
	}

	ip := t.IP.String()
	addr := net.JoinHostPort(ip, fmt.Sprintf("%d", t.Port))

	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		return nil
	}
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	buf := make([]byte, maxReadBytes)
	n, err := conn.Read(buf)
	if err != nil || n <= 0 {
		return nil
	}

	raw := buf[:n]
	banner := sanitizeBanner(raw)

	if len(banner) > 512 {
		banner = banner[:512]
	}

	return &ServiceScanResult{
		Protocol:  "TCP",
		Timestamp: time.Now().Unix(),
		Banner:    banner,
		Info: map[string]any{
			"bytes_read": n,
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
