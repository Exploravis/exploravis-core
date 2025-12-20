package kafka

import "time"

type Signal struct {
	SignalID string `json:"signal_id"`
	ScanID   string `json:"scan_id"`
	Type     string `json:"type"`

	IP   string `json:"ip"`
	Port int    `json:"port,omitempty"`

	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}

// Fact represents an immutable observation from a worker
type Fact struct {
	FactType string `json:"fact_type"`
	FactID   string `json:"fact_id,omitempty"`
	ScanID   string `json:"scan_id"`

	IP   string `json:"ip"`
	Port int    `json:"port,omitempty"`

	Proto string `json:"proto,omitempty"`

	ObservedAt time.Time `json:"observed_at"`

	Source string `json:"source"`

	Confidence *float64 `json:"confidence,omitempty"`

	Payload map[string]any `json:"payload,omitempty"`
}
