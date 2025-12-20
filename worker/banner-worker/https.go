package main

import (
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
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
		return &ServiceScanResult{
			Protocol:  "HTTPS",
			Timestamp: time.Now().Unix(),
			Info:      map[string]any{"error": err.Error()},
		}
	}
	defer conn.Close()

	// Send GET request
	req := fmt.Sprintf(
		"GET / HTTP/1.1\r\nHost: %s\r\nUser-Agent: Exploravis-Scanner\r\nConnection: close\r\n\r\n",
		ipStr,
	)
	_ = conn.SetWriteDeadline(time.Now().Add(writeTimeout))
	_, _ = conn.Write([]byte(req))

	// Read response
	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))
	raw, _ := io.ReadAll(io.LimitReader(conn, maxRead))
	if len(raw) > maxStore {
		raw = raw[:maxStore]
	}

	// Parse HTTP response
	statusLine, headers, body := parseHTTPResponse(raw)
	title := extractTitle(body)
	h := sha256.Sum256([]byte(body))
	bodyHash := "sha256:" + hex.EncodeToString(h[:])

	// TLS metadata
	state := conn.ConnectionState()
	tlsInfo := map[string]any{
		"version":             tlsVersionString(state.Version),
		"cipher_suite":        tls.CipherSuiteName(state.CipherSuite),
		"handshake_ok":        state.HandshakeComplete,
		"negotiated_protocol": state.NegotiatedProtocol,
		"alpn":                state.NegotiatedProtocol,
	}

	if len(state.PeerCertificates) > 0 {
		c := state.PeerCertificates[0]
		tlsInfo["certificate"] = map[string]any{
			"subject":    c.Subject.String(),
			"issuer":     c.Issuer.String(),
			"dns_names":  c.DNSNames,
			"serial":     c.SerialNumber.String(),
			"not_before": c.NotBefore,
			"not_after":  c.NotAfter,
			"sig_alg":    c.SignatureAlgorithm.String(),
			"public_key": fmt.Sprintf("%T", c.PublicKey),
		}
	}

	// Build unified banner
	var banner strings.Builder
	banner.WriteString(fmt.Sprintf("TLS: %s %s\n", tlsInfo["version"], tlsInfo["cipher_suite"]))
	if statusLine != "" {
		banner.WriteString(statusLine + "\n")
	}
	for k, v := range headers {
		banner.WriteString(fmt.Sprintf("%s: %s\n", k, v))
	}
	banner.WriteString(body)

	// Structured HTTP info
	httpInfo := map[string]any{
		"status_line":  statusLine,
		"headers":      headers,
		"title":        title,
		"body_len":     len(body),
		"body_preview": body,
		"body_hash":    bodyHash,
	}

	return &ServiceScanResult{
		Protocol:  "HTTPS",
		Timestamp: time.Now().Unix(),
		Banner:    banner.String(),
		Info: map[string]any{
			"http": httpInfo,
			"tls":  tlsInfo,
		},
	}
}
func parseHTTPResponse(raw []byte) (string, map[string]string, string) {
	s := string(raw)

	parts := strings.SplitN(s, "\r\n\r\n", 2)
	head := parts[0]
	body := ""
	if len(parts) > 1 {
		body = parts[1]
	}

	lines := strings.Split(head, "\r\n")
	if len(lines) == 0 {
		return "", map[string]string{}, body
	}

	statusLine := lines[0]
	headers := make(map[string]string)

	for _, l := range lines[1:] {
		if !strings.Contains(l, ":") {
			continue
		}
		key, val, _ := strings.Cut(l, ":")
		headers[strings.ToLower(strings.TrimSpace(key))] = strings.TrimSpace(val)
	}

	return statusLine, headers, body
}

func extractTitle(body string) string {
	low := strings.ToLower(body)
	i := strings.Index(low, "<title>")
	if i == -1 {
		return ""
	}
	j := strings.Index(low[i:], "</title>")
	if j == -1 {
		return ""
	}
	return strings.TrimSpace(body[i+7 : i+j])
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
