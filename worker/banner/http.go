package main

import (
	"context"
	"log"
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
	if err != nil {
		log.Printf("Scan failed for %s:%d: %v", t.IP.String(), t.Port, err)
		return nil
	}

	if status != zgrab2.SCAN_SUCCESS {
		log.Printf("Scan not successful for %s:%d (Status: %s)", t.IP.String(), t.Port, status)
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
	httpInfo := map[string]any{
		"status":      res.Response.Status,
		"status_code": res.Response.StatusCode,
		"headers":     res.Response.Header,
		"content":     body,
		"body_len":    len(body),
		"content_len": res.Response.ContentLength,
	}

	return &ServiceScanResult{
		IP:        t.IP.String(),
		Port:      int(t.Port),
		Protocol:  "HTTP",
		HTTP:      httpInfo,
		Timestamp: time.Now().Unix(),
	}
}
