package main

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/zmap/zgrab2"
	ftpmod "github.com/zmap/zgrab2/modules/ftp"
)

func scanFTP(t *zgrab2.ScanTarget) *ServiceScanResult {
	log.Printf("Scanning target: %s:%d", t.IP.String(), t.Port)

	var mod ftpmod.Module
	flags := mod.NewFlags().(*ftpmod.Flags)
	flags.Verbose = true
	flags.FTPAuthTLS = false
	flags.ImplicitTLS = false

	scanner := mod.NewScanner()
	if err := scanner.Init(flags); err != nil {
		log.Printf("Couldn't init FTP scanner: %v", err)
		return &ServiceScanResult{
			Protocol:  "FTP",
			Info:      map[string]any{"error": err.Error()},
			Timestamp: time.Now().Unix(),
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	var dialerGroup *zgrab2.DialerGroup
	if cfg := scanner.GetDialerGroupConfig(); cfg != nil {
		dg, err := cfg.GetDefaultDialerGroupFromConfig()
		if err != nil {
			log.Printf("Failed to build default DialerGroup: %v", err)
			return &ServiceScanResult{
				Protocol:  "FTP",
				Info:      map[string]any{"error": err.Error()},
				Timestamp: time.Now().Unix(),
			}
		}
		dialerGroup = dg
	}

	status, out, err := scanner.Scan(ctx, dialerGroup, t)
	if err != nil {
		log.Printf("FTP scan failed for %s:%d: %v", t.IP.String(), t.Port, err)
		return &ServiceScanResult{
			Protocol:  "FTP",
			Info:      map[string]any{"error": err.Error()},
			Timestamp: time.Now().Unix(),
		}
	}

	if status != zgrab2.SCAN_SUCCESS {
		log.Printf("FTP scan not successful for %s:%d (Status: %s)", t.IP.String(), t.Port, status)
		return &ServiceScanResult{
			Protocol:  "FTP",
			Info:      map[string]any{"status": status},
			Timestamp: time.Now().Unix(),
		}
	}

	res, ok := out.(*ftpmod.ScanResults)
	if !ok || res == nil {
		log.Printf("FTP scan output invalid for %s:%d", t.IP.String(), t.Port)
		return &ServiceScanResult{
			Protocol:  "FTP",
			Info:      map[string]any{"error": "invalid scan output"},
			Timestamp: time.Now().Unix(),
		}
	}

	bannerParts := []string{}
	if res.Banner != "" {
		bannerParts = append(bannerParts, res.Banner)
	}
	if res.AuthTLSResp != "" {
		bannerParts = append(bannerParts, res.AuthTLSResp)
	}
	if res.AuthSSLResp != "" {
		bannerParts = append(bannerParts, res.AuthSSLResp)
	}
	unifiedBanner := sanitizeBanner([]byte(strings.Join(bannerParts, " | ")))

	return &ServiceScanResult{
		Protocol:  "FTP",
		Timestamp: time.Now().Unix(),
		Banner:    unifiedBanner,
		Info: map[string]any{
			"raw_banner":    res.Banner,
			"auth_tls_resp": res.AuthTLSResp,
			"auth_ssl_resp": res.AuthSSLResp,
			"implicit_tls":  res.ImplicitTLS,
		},
	}
}
