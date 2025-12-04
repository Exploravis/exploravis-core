package main

import (
	"strconv"
	"time"

	"github.com/adedayo/sshscan"
	"github.com/zmap/zgrab2"
)

func scanSSH(t *zgrab2.ScanTarget) *ServiceScanResult {
	portStr := strconv.Itoa(int(t.Port))
	ipStr := t.IP.String()

	ex := sshscan.Inspect(ipStr, portStr)

	if ex.Fail {
		return &ServiceScanResult{
			IP:       ipStr,
			Port:     int(t.Port),
			Protocol: "SSH",
			Meta:     map[string]any{"error": ex.FailReason},
		}
	}

	sshInfo := map[string]any{
		"banner":                ex.ProtocolVersion,
		"kex_algorithms":        ex.KEXAlgorithms,
		"server_host_key_algos": ex.ServerHostKeyAlgos,
		"enc_algos_c2s":         ex.EncAlgosC2S,
		"enc_algos_s2c":         ex.EncAlgosS2C,
		"mac_algos_c2s":         ex.MACAlgosC2S,
		"mac_algos_s2c":         ex.MACAlgosS2C,
		"compression_c2s":       ex.CompAlgosC2S,
		"compression_s2c":       ex.CompAlgosS2C,
		"languages_c2s":         ex.LanguagesC2S,
		"languages_s2c":         ex.LanguagesS2C,
	}

	return &ServiceScanResult{
		IP:        ipStr,
		Port:      int(t.Port),
		Protocol:  "SSH",
		Timestamp: time.Now().Unix(),
		SSH:       sshInfo,
		RawTCP:    ex.ProtocolVersion,
	}
}
