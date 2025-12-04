package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"strconv"
	"time"

	"github.com/zmap/zgrab2"
)

func scanHTTPS(target *zgrab2.ScanTarget) *ServiceScanResult {
	const (
		dialTimeout  = 5 * time.Second
		writeTimeout = 3 * time.Second
		readTimeout  = 5 * time.Second
		maxRead      = 64 * 1024
		maxStore     = 512
	)

	ipStr := target.IP.String()
	addr := net.JoinHostPort(ipStr, strconv.Itoa(int(target.Port)))

	tlsCfg := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         ipStr,
	}

	dialer := &net.Dialer{Timeout: dialTimeout}
	conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
	if err != nil {
		log.Printf("tls dial failed for %s: %v", addr, err)
		return &ServiceScanResult{
			IP:       ipStr,
			Port:     int(target.Port),
			Protocol: "HTTPS",
			Meta:     map[string]any{"error": err.Error()},
		}
	}
	defer conn.Close()

	req := fmt.Sprintf(
		"GET / HTTP/1.1\r\nHost: %s\r\nUser-Agent: Exploravis-Scanner\r\nConnection: close\r\n\r\n",
		ipStr,
	)

	_ = conn.SetWriteDeadline(time.Now().Add(writeTimeout))
	if _, err := conn.Write([]byte(req)); err != nil {
		log.Printf("TLS write failed for %s: %v", addr, err)
	}

	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))
	raw, _ := io.ReadAll(io.LimitReader(conn, maxRead))

	if len(raw) > maxStore {
		raw = raw[:maxStore]
	}
	body := string(raw)

	state := conn.ConnectionState()
	tlsInfo := map[string]any{
		"version":             tlsVersionString(state.Version),
		"cipher_suite":        tls.CipherSuiteName(state.CipherSuite),
		"handshake_ok":        state.HandshakeComplete,
		"negotiated_protocol": state.NegotiatedProtocol,
	}

	if len(state.PeerCertificates) > 0 {
		c := state.PeerCertificates[0]
		tlsInfo["certificate"] = map[string]any{
			"subject":    c.Subject.String(),
			"issuer":     c.Issuer.String(),
			"dns_names":  c.DNSNames,
			"email":      c.EmailAddresses,
			"serial":     c.SerialNumber.String(),
			"not_before": c.NotBefore,
			"not_after":  c.NotAfter,
			"sig_alg":    c.SignatureAlgorithm.String(),
			"public_key": fmt.Sprintf("%T", c.PublicKey),
		}
	}

	httpMap := map[string]any{}
	if len(raw) > 0 {
		var statusLine string
		if idx := indexOfCRLF(raw); idx > 0 {
			statusLine = string(raw[:idx])
		} else {
			limit := min(len(raw), 128)
			statusLine = string(raw[:limit])
		}

		httpMap["status_line"] = statusLine
		httpMap["body_snippet"] = body
	}

	return &ServiceScanResult{
		IP:        ipStr,
		Port:      int(target.Port),
		Protocol:  "HTTPS",
		Timestamp: time.Now().Unix(),
		TLS:       tlsInfo,
		HTTP:      httpMap,
		Banner:    body,
	}
}

func indexOfCRLF(b []byte) int {
	for i := 0; i+1 < len(b); i++ {
		if b[i] == '\r' && b[i+1] == '\n' {
			return i
		}
	}
	return -1
}

func tlsVersionString(v uint16) string {
	switch v {
	case tls.VersionTLS10:
		return "TLS1.0"
	case tls.VersionTLS11:
		return "TLS1.1"
	case tls.VersionTLS12:
		return "TLS1.2"
	case tls.VersionTLS13:
		return "TLS1.3"
	default:
		return fmt.Sprintf("unknown(0x%x)", v)
	}
}
