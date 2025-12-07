package main

import (
	"encoding/json"
	"log"
	"os"
)

func testEnricherStandalone() {
	geoPath := os.Getenv("MAXMIND_CITY_DB")
	asnPath := os.Getenv("MAXMIND_ASN_DB")

	enricher, err := NewEnricher(geoPath, asnPath)
	if err != nil {
		log.Fatalf("failed to init enricher: %v", err)
	}
	defer enricher.Close()

	// --- IPs to test ---
	samples := []string{
		"8.8.8.8",
		"41.111.132.172",
	}

	for _, ip := range samples {
		src := ServiceScanResult{
			IP:   ip,
			Port: 80,
			Meta: map[string]any{}, // so enricher fills geo/asn
		}

		enriched, err := enricher.enrichMessage(src)
		if err != nil {
			log.Printf("error enriching %s: %v", ip, err)
			continue
		}

		b, _ := json.MarshalIndent(enriched, "", "  ")
		log.Println("---- RESULT FOR", ip, "----")
		log.Println(string(b))
	}
}
