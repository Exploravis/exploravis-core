package main

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/RumbleDiscovery/recog-go"
)

func main() {
	xmlDir := filepath.Join("/home/x0rw/recog-db/xml")
	fpSet, err := recog.LoadFingerprintsDir(xmlDir)
	if err != nil {
		log.Fatalf("Failed to load fingerprints: %v", err)
	}

	banner := "5.7.26-0ubuntu0.18.04.1-log-Linux"

	for dbName := range fpSet.Databases {
		matches := fpSet.MatchAll(dbName, banner)
		for _, m := range matches {
			if m.Matched {
				fmt.Printf("Database: %s\n", dbName)
				fmt.Println("Values:")
				for k, v := range m.Values {
					fmt.Printf("  %s: %s\n", k, v)
				}
				fmt.Println("---")
			}
		}
	}
}
