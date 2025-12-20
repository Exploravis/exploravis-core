TOPICS := ip_scan_request scan_enrichment_request finished_scan ip_scan_result not_enriched_finished_scan
.PHONY: create-topics

install-telepresence:
	telepresence helm install
connect: 
	telepresence quit && telepresence connect 

api:
	cd orchestrator && go run . 
scanner:
	cd worker/scanner-worker && go run main.go

banner:
	cd worker/banner-worker && go run . 

meta:
	cd worker/enrich-meta-worker && go run . 

elastic:
	cd worker/elasticsearch-worker && go run . 


inc-partition:
	@for topic in $(TOPICS); do \
		kubectl exec -n kafka redpanda-0 -- rpk topic add-partitions $$topic -n 8; \
	done

create-topics:
	@for topic in $(TOPICS); do \
	echo "Creating topic $$topic..."; \
	kubectl exec -n kafka redpanda-0 -- rpk topic create $$topic || echo "$$topic already exists"; \
	done

ES_URL=http://elasticsearch-cluster-master.elasticsearch.svc:9200
INDEX=scans-stats

.PHONY: create-index
create-index:
	curl -X PUT "$(ES_URL)/$(INDEX)" \
	     -H 'Content-Type: application/json' \
	     -d @mapping/scans-stats-mapping.json

.PHONY: reset-index
reset-index:
	curl -X DELETE "$(ES_URL)/$(INDEX)"
	make create-index


# If there was an unexpected issue with telepresence use this ma3reftx 3lax but it worked lol
#
# pkill -f telepresence
# sudo chown -R $USER:$USER /tmp/telepresence*
# sudo rm -f /var/run/telepresence-daemon.socket
# sudo rm -f /tmp/telepresence-*.sock
# sudo systemctl stop telepresence-root-daemon.service 2>/dev/null
# pkill -f telepresence
