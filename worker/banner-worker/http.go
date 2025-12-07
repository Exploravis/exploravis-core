package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"strings"
	"time"

	"github.com/zmap/zgrab2"
	httpmod "github.com/zmap/zgrab2/modules/http"
)

func scanHTTP(t *zgrab2.ScanTarget) *ServiceScanResult {
	log.Printf("Scanning target: %s:%d", t.IP.String(), t.Port)

	var mod httpmod.Module
	flags := mod.NewFlags().(*httpmod.Flags)
	flags.UserAgent = "Exploravis-Scanner"
	flags.WithBodyLength = true
	flags.MaxSize = 256
	flags.MaxRedirects = 0

	scanner := mod.NewScanner()
	if err := scanner.Init(flags); err != nil {
		log.Printf("Couldn't init scanner: %v", err)
		return nil
	}

	var dialerGroup *zgrab2.DialerGroup
	if cfg := scanner.GetDialerGroupConfig(); cfg != nil {
		dg, err := cfg.GetDefaultDialerGroupFromConfig()
		if err != nil {
			log.Printf("Failed to build default DialerGroup: %v", err)
			return nil
		}
		dialerGroup = dg
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	status, out, err := scanner.Scan(ctx, dialerGroup, t)
	if err != nil || status != zgrab2.SCAN_SUCCESS {
		log.Printf("Scan failed for %s:%d: %v", t.IP.String(), t.Port, err)
		return nil
	}

	res, ok := out.(*httpmod.Results)
	if !ok || res == nil || res.Response == nil {
		log.Printf("Scan output invalid for %s:%d", t.IP.String(), t.Port)
		return nil
	}

	body := res.Response.BodyText
	if len(body) > flags.MaxSize {
		body = body[:flags.MaxSize]
	}

	// --------------------------
	// Normalize headers
	// --------------------------
	normHeaders := make(map[string]string)
	for k, v := range res.Response.Header {
		key := strings.ToLower(strings.TrimSpace(k))
		normHeaders[key] = strings.Join(v, ", ")
	}

	// --------------------------
	// Title extraction
	// --------------------------
	lbody := strings.ToLower(body)
	title := ""
	if i := strings.Index(lbody, "<title>"); i != -1 {
		j := strings.Index(lbody[i:], "</title>")
		if j != -1 {
			title = body[i+7 : i+j]
			title = strings.TrimSpace(title)
		}
	}

	h := sha256.Sum256([]byte(body))
	bodyHash := "sha256:" + hex.EncodeToString(h[:])

	tags := []string{}
	if res.Response.StatusCode >= 300 && res.Response.StatusCode < 400 {
		tags = append(tags, "redirect")
	}

	if _, ok := normHeaders["www-authenticate"]; ok {
		tags = append(tags, "auth-required")
	}

	var bannerBuilder strings.Builder
	bannerBuilder.WriteString(res.Response.Status)
	bannerBuilder.WriteString("\n")

	for k, v := range normHeaders {
		bannerBuilder.WriteString(k + ": " + v + "\n")
	}

	bannerBuilder.WriteString(body)
	bannerStr := bannerBuilder.String()

	httpInfo := map[string]any{
		"status_code":    res.Response.StatusCode,
		"headers":        normHeaders,
		"title":          title,
		"body_preview":   body,
		"body_hash":      bodyHash,
		"content_length": len(body),
		"tags":           tags,
	}

	return &ServiceScanResult{
		IP:        t.IP.String(),
		Port:      int(t.Port),
		Protocol:  "HTTP",
		Timestamp: time.Now().Unix(),
		Banner:    bannerStr,
		HTTP:      httpInfo,
	}
}
