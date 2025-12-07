package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	// "github.com/elastic/go-elasticsearch/v8/esapi"
)

type ServiceScanResult struct {
	ScanID    string         `json:"scan_id,omitempty"`
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

type ScanResponse struct {
	Total   int                 `json:"total"`
	Results []ServiceScanResult `json:"results"`
	Aggs    map[string]any      `json:"aggs,omitempty"`
	TookMS  int                 `json:"took_ms"`
}

// ------------------------
// Query Builder
// ------------------------
func buildESQuery(params map[string][]string) map[string]any {
	size := 20
	from := 0
	sortField := "timestamp"
	sortOrder := "desc"

	if v := params["size"]; len(v) > 0 {
		if s, err := strconv.Atoi(v[0]); err == nil && s > 0 {
			size = s
			if size > 1000 {
				size = 1000
			}
		}
	}
	if v := params["from"]; len(v) > 0 {
		if f, err := strconv.Atoi(v[0]); err == nil && f >= 0 {
			from = f
		}
	}
	if v := params["sort"]; len(v) > 0 {
		if strings.HasPrefix(v[0], "-") {
			sortField = v[0][1:]
			sortOrder = "desc"
		} else {
			sortField = v[0]
			sortOrder = "asc"
		}
	}

	boolMust := []map[string]any{}
	boolFilter := []map[string]any{}

	// ------------------------
	// Simple field filters
	// ------------------------
	if v := params["scan_id"]; len(v) > 0 {
		boolFilter = append(boolFilter, map[string]any{
			"terms": map[string]any{"scan_id.keyword": v},
		})
	}
	if v := params["ip"]; len(v) > 0 {
		boolFilter = append(boolFilter, map[string]any{"terms": map[string]any{"ip.keyword": v}})
	}
	if v := params["protocol"]; len(v) > 0 {
		boolMust = append(boolMust, map[string]any{"terms": map[string]any{"protocol.keyword": v}})
	}

	if v := params["country"]; len(v) > 0 {
		boolMust = append(boolMust, map[string]any{"terms": map[string]any{"meta.geo.country.keyword": v}})
	}
	if v := params["service"]; len(v) > 0 {
		boolMust = append(boolMust, map[string]any{"terms": map[string]any{"service.keyword": v}})
	}
	if v := params["port"]; len(v) > 0 {
		ports := []int{}
		for _, s := range v {
			if p, err := strconv.Atoi(s); err == nil {
				ports = append(ports, p)
			}
		}
		if len(ports) > 0 {
			boolFilter = append(boolFilter, map[string]any{"terms": map[string]any{"port": ports}})
		}
	}

	// ------------------------
	// Banner searches
	// ------------------------
	banner := ""
	bannerType := ""
	if v := params["banner"]; len(v) > 0 {
		banner = v[0]
	}
	if v := params["banner_type"]; len(v) > 0 {
		bannerType = v[0]
	}
	if banner != "" {
		switch bannerType {
		case "phrase":
			boolMust = append(boolMust, map[string]any{"match_phrase": map[string]any{"banner": banner}})
		case "prefix":
			boolMust = append(boolMust, map[string]any{"prefix": map[string]any{"banner.keyword": banner}})
		case "wildcard":
			boolMust = append(boolMust, map[string]any{"wildcard": map[string]any{"banner.keyword": map[string]any{"value": banner}}})
		default:
			boolMust = append(boolMust, map[string]any{"match": map[string]any{"banner": map[string]any{"query": banner, "operator": "and"}}})
		}
	}

	// ------------------------
	// Shodan-like query
	// ------------------------
	if v := params["q"]; len(v) > 0 {
		qv := v[0]
		// Parse Shodan-like queries (you can implement parseShodanLikeQuery)
		t := parseShodanLikeQuery(qv)

		// positive filters
		for f, vals := range t.FieldTerms {
			for _, v := range vals {
				switch f {
				case "ip":
					boolFilter = append(boolFilter, map[string]any{"term": map[string]any{"ip.keyword": v}})

				case "country":
					boolFilter = append(boolFilter, map[string]any{"term": map[string]any{"meta.geo.country.keyword": v}})
				case "port":
					if a, b, ok := parseNumericRange(v); ok {
						boolFilter = append(boolFilter, map[string]any{"range": map[string]any{"port": map[string]any{"gte": a, "lte": b}}})
					} else if p, err := strconv.Atoi(v); err == nil {
						boolFilter = append(boolFilter, map[string]any{"term": map[string]any{"port": p}})
					}
				default:
					boolMust = append(boolMust, map[string]any{"match": map[string]any{f: v}})
				}
			}
		}
		// free-text search
		if len(t.FreeTerms) > 0 {
			boolMust = append(boolMust, map[string]any{"simple_query_string": map[string]any{
				"query":            strings.Join(t.FreeTerms, " "),
				"fields":           []string{"banner^3", "http.body_preview", "raw_tcp", "ssh.banner^2"},
				"default_operator": "and",
			}})
		}
	}

	// ------------------------
	// Aggregations
	// ------------------------
	defaultAggs := map[string]any{
		"top_ports":        map[string]any{"terms": map[string]any{"field": "port", "size": 10}},
		"top_http_servers": map[string]any{"terms": map[string]any{"field": "http.headers.server.keyword", "size": 12}},
		"by_country":       map[string]any{"terms": map[string]any{"field": "meta.geo.country.keyword", "size": 100}},
		"top_orgs":         map[string]any{"terms": map[string]any{"field": "meta.asn.org.keyword", "size": 10}},
	}

	aggs := defaultAggs
	if v := params["aggs"]; len(v) > 0 && v[0] == "none" {
		aggs = nil
	}

	// ------------------------
	// Build final ES body
	// ------------------------
	body := map[string]any{
		"size": size,
		"from": from,
		"sort": []map[string]any{
			{sortField: map[string]any{"order": sortOrder}},
		},
		"highlight": map[string]any{
			"pre_tags":  []string{"<em>"},
			"post_tags": []string{"</em>"},
			"fields":    map[string]any{"banner": map[string]any{}},
		},
	}

	if len(boolMust) > 0 || len(boolFilter) > 0 {
		boolQuery := map[string]any{}
		if len(boolMust) > 0 {
			boolQuery["must"] = boolMust
		}
		if len(boolFilter) > 0 {
			boolQuery["filter"] = boolFilter
		}
		body["query"] = map[string]any{"bool": boolQuery}
	} else {
		body["query"] = map[string]any{"match_all": map[string]any{}}
	}

	if aggs != nil {
		body["aggs"] = aggs
	}

	return body
}

// ------------------------
// HTTP Handler
// ------------------------
func scansHandler(es *elasticsearch.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		// Build query
		bodyMap := buildESQuery(r.URL.Query())
		bodyBytes, err := json.Marshal(bodyMap)
		if err != nil {
			http.Error(w, "failed to marshal ES body", http.StatusInternalServerError)
			return
		}

		log.Printf("[ES] Query body: %s", string(bodyBytes))

		// Execute search
		res, err := es.Search(
			es.Search.WithContext(ctx),
			es.Search.WithIndex("scans-000001"),
			es.Search.WithBody(bytes.NewReader(bodyBytes)),
			es.Search.WithTrackTotalHits(true),
		)
		if err != nil {
			http.Error(w, "ES search failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer res.Body.Close()

		if res.IsError() {
			http.Error(w, "ES returned error: "+res.String(), http.StatusInternalServerError)
			return
		}

		var doc map[string]any
		if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
			http.Error(w, "failed to parse ES response: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Parse results
		total := 0
		if hitsObj, ok := doc["hits"].(map[string]any); ok {
			switch tv := hitsObj["total"].(type) {
			case map[string]any:
				if v, ok := tv["value"].(float64); ok {
					total = int(v)
				}
			case float64:
				total = int(tv)
			}
		}

		results := []ServiceScanResult{}
		if hitsObj, ok := doc["hits"].(map[string]any); ok {
			if hitsArr, ok := hitsObj["hits"].([]any); ok {
				for _, h := range hitsArr {
					if hitMap, ok := h.(map[string]any); ok {
						if src, ok := hitMap["_source"]; ok {
							b, _ := json.Marshal(src)
							var s ServiceScanResult
							_ = json.Unmarshal(b, &s)
							if hm, ok := hitMap["highlight"].(map[string]any); ok {
								if s.Meta == nil {
									s.Meta = map[string]any{}
								}
								s.Meta["_highlight"] = hm
							}
							results = append(results, s)
						}
					}
				}
			}
		}

		aggs := map[string]any{}
		if a, ok := doc["aggregations"].(map[string]any); ok {
			aggs = a
		}

		resp := ScanResponse{
			Total:   total,
			Results: results,
			Aggs:    aggs,
			TookMS:  int(doc["took"].(float64)),
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
}
