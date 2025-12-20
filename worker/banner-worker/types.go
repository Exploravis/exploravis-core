package main

type PortsScanRequest struct {
	ScanID string `json:"scan_id"`
	IP     string `json:"host"`
	Ports  string `json:"ports"`
	Time   int64  `json:"timestamp"`
}

type ServiceScanRequest struct {
	ScanID string
	IP     string
	Port   int
}

type ServiceScanResult struct {
	Timestamp int64          `json:"timestamp"`
	Protocol  string         `json:"protocol"`
	Service   string         `json:"service,omitempty"`
	Banner    string         `json:"banner,omitempty"`
	Info      map[string]any `json:"info,omitempty"`
}
