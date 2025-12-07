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
	Port   string
}

type ServiceScanResult struct {
	ScanID    string         `json:"scan_id"`
	IP        string         `json:"ip"`
	Port      int            `json:"port"`
	Timestamp int64          `json:"timestamp"`
	Protocol  string         `json:"protocol"`
	Service   string         `json:"service,omitempty"`
	Banner    string         `json:"banner,omitempty"`
	TLS       map[string]any `json:"tls,omitempty"`
	HTTP      map[string]any `json:"http,omitempty"`
	SSH       map[string]any `json:"ssh,omitempty"`
	RawTCP    string         `json:"raw_tcp,omitempty"`
	Meta      map[string]any `json:"meta,omitempty"`
}
