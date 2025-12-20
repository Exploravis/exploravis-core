package scanner

import (
	"strconv"
	"strings"

	"github.com/projectdiscovery/naabu/v2/pkg/port"
)

func portsToString(ports []*port.Port) string {

	if len(ports) == 0 {
		return ""
	}
	out := make([]string, 0, len(ports))
	for _, p := range ports {
		out = append(out, strconv.Itoa(p.Port))
	}
	return strings.Join(out, ",")
}
