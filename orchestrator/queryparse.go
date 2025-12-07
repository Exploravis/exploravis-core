package main

import (
	"regexp"
	"strconv"
	"strings"
)

type TokenizedQuery struct {
	FieldTerms    map[string][]string
	NotFieldTerms map[string][]string
	FreeTerms     []string
}

func parseShodanLikeQuery(q string) TokenizedQuery {
	out := TokenizedQuery{
		FieldTerms:    map[string][]string{},
		NotFieldTerms: map[string][]string{},
		FreeTerms:     []string{},
	}

	quotedRe := regexp.MustCompile(`"([^"]+)"`)
	for _, m := range quotedRe.FindAllStringSubmatch(q, -1) {
		if len(m) > 1 {
			out.FreeTerms = append(out.FreeTerms, m[1])
		}
	}

	q = quotedRe.ReplaceAllString(q, " ")

	parts := strings.Fields(q)
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		neg := false
		if strings.HasPrefix(p, "-") {
			neg = true
			p = strings.TrimPrefix(p, "-")
		}

		if strings.Contains(p, ":") {
			kv := strings.SplitN(p, ":", 2)
			field := strings.ToLower(strings.TrimSpace(kv[0]))
			val := strings.TrimSpace(kv[1])
			if val == "" {
				continue
			}
			if neg {
				out.NotFieldTerms[field] = append(out.NotFieldTerms[field], val)
			} else {
				out.FieldTerms[field] = append(out.FieldTerms[field], val)
			}
		} else {

			if neg {

				out.NotFieldTerms["_free"] = append(out.NotFieldTerms["_free"], p)
			} else {
				out.FreeTerms = append(out.FreeTerms, p)
			}
		}
	}
	return out
}

func parseNumericRange(v string) (int, int, bool) {
	if strings.Contains(v, "-") {
		parts := strings.SplitN(v, "-", 2)
		a, err1 := strconv.Atoi(parts[0])
		b, err2 := strconv.Atoi(parts[1])
		if err1 == nil && err2 == nil {
			if a > b {
				a, b = b, a
			}
			return a, b, true
		}
	}
	return 0, 0, false
}
