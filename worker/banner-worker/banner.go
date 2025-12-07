package main

import (
	"encoding/json"
	"log"
	"net"
	"strconv"

	// "github.com/projectdiscovery/naabu/v2/pkg/port"
	"github.com/exploravis/worker/banner-worker/producer"
	"github.com/zmap/zgrab2"
)

func grabBanner(s ServiceScanRequest) ServiceScanResult {
	portNum, err := strconv.Atoi(s.Port)
	if err != nil {
		return ServiceScanResult{
			IP:     s.IP,
			ScanID: s.ScanID,
			Port:   0,
			Meta:   map[string]any{"error": "invalid port"},
		}
	}

	target := &zgrab2.ScanTarget{
		IP:   net.ParseIP(s.IP),
		Port: uint(portNum),
	}

	if target.IP == nil {
		return ServiceScanResult{
			IP:     s.IP,
			ScanID: s.ScanID,
			Port:   portNum,
			Meta:   map[string]any{"error": "invalid IP format"},
		}
	}

	var result *ServiceScanResult

	switch portNum {

	// HTTP family
	case 80, 8080, 8000:
		result = scanHTTP(target)

	// HTTPS
	case 443:
		result = scanHTTPS(target)

	case 21:
		result = scanFTP(target)

	case 22:
		result = scanSSH(target)

	default:
		result = scanRawTCP(target)
	}

	// this shouldn't happen
	if result == nil {
		return ServiceScanResult{
			IP:     s.IP,
			ScanID: s.ScanID,
			Port:   portNum,
			Meta:   map[string]any{"error": "scan failed or timed out"},
		}
	}

	result.ScanID = s.ScanID
	b, err := json.MarshalIndent(result, "", " ")
	if err != nil {
		log.Println("marshal error:", err)
	} else {
		log.Println("==========================")
		log.Println(string(b))
	}

	value, err := json.Marshal(result)
	if err != nil {
		log.Printf("marshal error: %v", err)
		return ServiceScanResult{}
	}
	producer.ProduceResult(value)

	return *result
}
