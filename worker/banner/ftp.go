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
		log.Printf("couldn't init FTP scanner: %v", err)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	var dialerGroup *zgrab2.DialerGroup
	if cfg := scanner.GetDialerGroupConfig(); cfg != nil {
		dg, err := cfg.GetDefaultDialerGroupFromConfig()
		if err != nil {
			log.Printf("failed to build default DialerGroup: %v", err)
			return nil
		}
		dialerGroup = dg
	}

	status, out, err := scanner.Scan(ctx, dialerGroup, t)
	if err != nil {
		log.Printf("FTP scan failed for %s:%d: %v", t.IP.String(), t.Port, err)
		return &ServiceScanResult{
			IP:       t.IP.String(),
			Port:     int(t.Port),
			Protocol: "FTP",
			Meta:     map[string]any{"error": err.Error()},
		}
	}

	if status != zgrab2.SCAN_SUCCESS {
		log.Printf("FTP scan not successful for %s:%d (Status: %s)", t.IP.String(), t.Port, status)
		return &ServiceScanResult{
			IP:       t.IP.String(),
			Port:     int(t.Port),
			Protocol: "FTP",
			Meta:     map[string]any{"status": status},
		}
	}

	res, ok := out.(*ftpmod.ScanResults)
	if !ok || res == nil {
		log.Printf("FTP scan output invalid for %s:%d", t.IP.String(), t.Port)
		return &ServiceScanResult{
			IP:       t.IP.String(),
			Port:     int(t.Port),
			Protocol: "FTP",
			Meta:     map[string]any{"error": "invalid scan output"},
		}
	}

	// Compose unified banner (Shodan-style)
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
		IP:        t.IP.String(),
		Port:      int(t.Port),
		Protocol:  "FTP",
		Timestamp: time.Now().Unix(),
		RawTCP:    res.Banner,
		Banner:    unifiedBanner,
		Meta: map[string]any{
			"auth_tls_resp": res.AuthTLSResp,
			"auth_ssl_resp": res.AuthSSLResp,
			"implicit_tls":  res.ImplicitTLS,
		},
	}
}
