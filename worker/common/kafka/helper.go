package kafka

import (
	"crypto/sha1"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

func NewSignalID(scanID, host string, port int, signalType string) string {
	raw := fmt.Sprintf("%s|%s|%d|%s", scanID, host, port, signalType)
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

func NewFactID(ip string, port int, factType string, scanID string) string {
	h := sha1.New()
	fmt.Fprintf(h, "%s:%d:%s:%s", ip, port, factType, scanID)
	return hex.EncodeToString(h.Sum(nil))
}

func NewFact(factType, scanID, ip string, port int, source string, payload map[string]any) Fact {
	return Fact{
		FactType:   factType,
		ScanID:     scanID,
		IP:         ip,
		Port:       port,
		ObservedAt: time.Now().UTC(),
		Source:     source,
		Payload:    payload,
		FactID:     NewFactID(ip, port, factType, scanID),
	}
}

func NewSignal(scanID, signalType, ip string, port int, metadata map[string]any) Signal {

	return Signal{
		SignalID:  NewSignalID(scanID, ip, port, signalType),
		ScanID:    scanID,
		Type:      signalType,
		IP:        ip,
		Port:      port,
		Metadata:  metadata,
		CreatedAt: time.Now().UTC(),
	}
}
