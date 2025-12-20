package main

import (
	"log"
	"net"
	"time"

	"github.com/exploravis/worker/common/batch"
	"github.com/exploravis/worker/common/helpers"
	"github.com/exploravis/worker/common/kafka"
	"github.com/zmap/zgrab2"
)

func grabBanner(s ServiceScanRequest, factBatcher *batch.Batch[kafka.Fact]) *ServiceScanResult {
	portNum := s.Port
	target := &zgrab2.ScanTarget{
		IP:   net.ParseIP(s.IP),
		Port: uint(portNum),
	}
	log.Printf("grabbing banner for: %s:%d", s.IP, s.Port)

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
		log.Printf("resturned nil")
		return nil
		// todo
	}

	fact := kafka.Fact{
		FactType:   "banner_scan",
		ScanID:     s.ScanID,
		IP:         s.IP,
		Port:       s.Port,
		Payload:    helpers.StructToMap(result),
		ObservedAt: time.Now(),
		Source:     "banner-worker",
	}
	factBatcher.Add(fact)

	return result
}
