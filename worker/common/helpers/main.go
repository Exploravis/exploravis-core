package helpers

import (
	"encoding/json"
	"log"
)

func StructToMap(v any) map[string]any {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("error marshaling struct: %v", err)
		return map[string]any{"error": "failed to marshal struct"}
	}

	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		log.Printf("error unmarshaling struct to map: %v", err)
		return map[string]any{"error": "failed to unmarshal struct"}
	}

	return m
}
func ToJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		log.Fatalf("failed to marshal: %v", err)
	}
	return b
}
