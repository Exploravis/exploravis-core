package scanner

// The scan request recieved from kafka
type ScanRequest struct {
	ScanID string `json:"scan_id"`
	Cidr   string `json:"ip_range"`
	Ports  string `json:"ports"`
}

// The scan result sent to kafka
type ScanResult struct {
	ScanID string `json:"scan_id"`
	Host   string `json:"host"`
	Ports  string `json:"ports"`
	Time   int64  `json:"timestamp"`
}
