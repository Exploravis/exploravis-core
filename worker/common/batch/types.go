package batch

import (
	"time"

	"github.com/exploravis/worker/common/kafka"
)

type FactBatch struct {
	Schema  int    `json:"schema"`
	BatchID string `json:"batch_id"`

	Facts []kafka.Fact `json:"facts"`

	CreatedAt time.Time `json:"created_at"`
}

type SignalBatch struct {
	Schema     int    `json:"schema"`
	BatchID    string `json:"batch_id"`
	SignalType string `json:"signal_type"`

	Signals []kafka.Signal `json:"signals"`

	CreatedAt time.Time `json:"created_at"`
}
