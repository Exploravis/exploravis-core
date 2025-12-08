package main

type ServiceScanResult struct {
	ScanID    string         `json:"scan_id,omitempty"`
	IP        string         `json:"ip"`
	Port      int            `json:"port"`
	Timestamp int64          `json:"timestamp"`
	Service   string         `json:"service,omitempty"`
	Protocol  string         `json:"protocol"`
	Banner    string         `json:"banner,omitempty"`
	TLS       map[string]any `json:"tls,omitempty"`
	HTTP      map[string]any `json:"http,omitempty"`
	SSH       map[string]any `json:"ssh,omitempty"`
	RawTCP    string         `json:"raw_tcp,omitempty"`
	Meta      map[string]any `json:"meta,omitempty"`
}
