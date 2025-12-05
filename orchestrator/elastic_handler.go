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
	"github.com/elastic/go-elasticsearch/v8/esapi"
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

type ESQuery struct {
	Size  int              `json:"size"`
	From  int              `json:"from"`
	Sort  []map[string]any `json:"sort,omitempty"`
	Query map[string]any   `json:"query,omitempty"`
}
type ScanResponse struct {
	Total   int                 `json:"total"`
	Results []ServiceScanResult `json:"results"`
}

func scansHandler(es *elasticsearch.Client) http.Handler {
	allowed := map[string]struct{}{
		"ip": {}, "protocol": {}, "port": {}, "banner": {},
		"service": {}, "q": {}, "size": {}, "from": {}, "sort": {},
		"fields": {}, "aggs": {}, "banner_type": {},
	}
	const maxSize = 1000
	allowedSort := map[string]struct{}{
		"timestamp": {}, "ip": {}, "port": {}, "protocol": {},
		"http.headers.server.keyword": {},
	}

	defaultAggs := map[string]any{
		"top_ports":        map[string]any{"terms": map[string]any{"field": "port", "size": 10}},
		"top_http_servers": map[string]any{"terms": map[string]any{"field": "http.headers.server.keyword", "size": 12}},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		for k := range r.URL.Query() {
			if _, ok := allowed[k]; ok {
				continue
			}
			if strings.HasPrefix(k, "http_header.") {
				continue
			}
			http.Error(w, "unknown query param: "+k, http.StatusBadRequest)
			return
		}

		q := r.URL.Query()

		// pagination
		size, _ := strconv.Atoi(q.Get("size"))
		if size <= 0 {
			size = 20
		}
		if size > maxSize {
			size = maxSize
		}
		from, _ := strconv.Atoi(q.Get("from"))

		// sort validation
		sortField := "timestamp"
		sortOrder := "desc"
		if s := strings.TrimSpace(q.Get("sort")); s != "" {
			parts := strings.SplitN(s, ":", 2)
			if len(parts) == 2 {
				if _, ok := allowedSort[parts[0]]; ok {
					sortField = parts[0]
					if parts[1] == "asc" || parts[1] == "desc" {
						sortOrder = parts[1]
					}
				}
			} else if _, ok := allowedSort[s]; ok {
				sortField = s
			}
		}

		boolMust := make([]map[string]any, 0)
		boolFilter := make([]map[string]any, 0)

		// basic filters
		if ip := strings.TrimSpace(q.Get("ip")); ip != "" {
			boolFilter = append(boolFilter, map[string]any{"term": map[string]any{"ip.keyword": ip}})
		}
		if protocol := strings.TrimSpace(q.Get("protocol")); protocol != "" {
			boolMust = append(boolMust, map[string]any{"match": map[string]any{"protocol": protocol}})
		}
		if service := strings.TrimSpace(q.Get("service")); service != "" {
			boolMust = append(boolMust, map[string]any{"match": map[string]any{"service": service}})
		}
		if port := strings.TrimSpace(q.Get("port")); port != "" {
			if p, err := strconv.Atoi(port); err == nil {
				boolFilter = append(boolFilter, map[string]any{"term": map[string]any{"port": p}})
			}
		}

		// banner handling
		banner := strings.TrimSpace(q.Get("banner"))
		bannerType := strings.TrimSpace(q.Get("banner_type"))
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

		// global full-text
		if qv := strings.TrimSpace(q.Get("q")); qv != "" {
			boolMust = append(boolMust, map[string]any{
				"simple_query_string": map[string]any{
					"query":            qv,
					"fields":           []string{"banner^3", "http.body_preview", "http.content", "raw_tcp", "ssh.banner^2"},
					"default_operator": "and",
				},
			})
		}

		for k, vals := range r.URL.Query() {
			if !strings.HasPrefix(k, "http_header.") {
				continue
			}
			h := strings.TrimPrefix(k, "http_header.")
			if h == "" {
				continue
			}
			field := "http.headers." + strings.ToLower(strings.ReplaceAll(h, "-", "_"))

			if len(vals) == 1 {
				v := vals[0]
				if strings.Contains(v, "*") {
					boolMust = append(boolMust, map[string]any{"wildcard": map[string]any{field + ".keyword": map[string]any{"value": v}}})
				} else {
					boolMust = append(boolMust, map[string]any{"match": map[string]any{field: map[string]any{"query": v, "operator": "and"}}})
				}
			} else if len(vals) > 1 {
				shoulds := make([]map[string]any, 0, len(vals))
				for _, v := range vals {
					shoulds = append(shoulds, map[string]any{"match": map[string]any{field: map[string]any{"query": v}}})
				}
				boolMust = append(boolMust, map[string]any{"bool": map[string]any{"should": shoulds, "minimum_should_match": 1}})
			}
		}

		// aggregations
		var aggs map[string]any
		aggsParam := strings.TrimSpace(q.Get("aggs"))
		if aggsParam == "" {
			aggs = defaultAggs
		} else if aggsParam == "none" {
			aggs = nil
		} else {
			aggs = map[string]any{}
			requested := strings.Split(aggsParam, ",")
			for _, name := range requested {
				switch strings.TrimSpace(name) {
				case "ports":
					aggs["top_ports"] = map[string]any{"terms": map[string]any{"field": "port", "size": 20}}
				case "http_servers":
					aggs["top_http_servers"] = map[string]any{"terms": map[string]any{"field": "http.headers.server.keyword", "size": 12}}
				}
			}
		}

		// fields selection
		var sourceIncludes []string
		if f := strings.TrimSpace(q.Get("fields")); f != "" {
			for _, s := range strings.Split(f, ",") {
				s = strings.TrimSpace(s)
				if s != "" {
					sourceIncludes = append(sourceIncludes, s)
				}
			}
		}

		// build body
		bodyMap := map[string]any{
			"size": size,
			"from": from,
			"sort": []map[string]any{
				{sortField: map[string]any{"order": sortOrder}},
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
			bodyMap["query"] = map[string]any{"bool": boolQuery}
		} else {
			bodyMap["query"] = map[string]any{"match_all": map[string]any{}}
		}

		if aggs != nil {
			bodyMap["aggs"] = aggs
		}
		if len(sourceIncludes) > 0 {
			bodyMap["_source"] = map[string]any{"includes": sourceIncludes}
		}

		bodyMap["highlight"] = map[string]any{
			"pre_tags":  []string{"<em>"},
			"post_tags": []string{"</em>"},
			"fields":    map[string]any{"banner": map[string]any{}},
		}

		bodyBytes, err := json.Marshal(bodyMap)
		if err != nil {
			http.Error(w, "failed to build ES query", http.StatusInternalServerError)
			return
		}

		log.Printf("[ES] Search body: %s", string(bodyBytes))

		var res *esapi.Response
		try := 0
		for {
			try++
			res, err = es.Search(
				es.Search.WithContext(ctx),
				es.Search.WithIndex("scans-000001"),
				es.Search.WithBody(bytes.NewReader(bodyBytes)),
				es.Search.WithTrackTotalHits(true),
				es.Search.WithPretty(),
			)
			if err == nil {
				break
			}
			if (strings.Contains(err.Error(), "EOF") || strings.Contains(err.Error(), "connection reset")) && try == 1 {
				log.Printf("[ES] transient error: %v -- retrying once", err)
				time.Sleep(150 * time.Millisecond)
				continue
			}
			http.Error(w, "ES query failed: "+err.Error(), http.StatusInternalServerError)
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

		took := 0
		if v, ok := doc["took"].(float64); ok {
			took = int(v)
		}
		timedOut := false
		if v, ok := doc["timed_out"].(bool); ok {
			timedOut = v
		}

		results := make([]ServiceScanResult, 0)
		if hitsObj, ok := doc["hits"].(map[string]any); ok {
			if hitsArr, ok := hitsObj["hits"].([]any); ok {
				for _, h := range hitsArr {
					if hitMap, ok := h.(map[string]any); ok {
						if src, ok := hitMap["_source"]; ok {
							if b, err := json.Marshal(src); err == nil {
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
		}

		aggres := map[string]any{}
		if a, ok := doc["aggregations"].(map[string]any); ok {
			aggres = a
		}

		resp := map[string]any{
			"total":     total,
			"took_ms":   took,
			"timed_out": timedOut,
			"results":   results,
			"aggs":      aggres,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
}
