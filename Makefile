TOPICS := ip_scan_request scan_enrichment_request finished_scan ip_scan_result not_enriched_finished_scan
.PHONY: create-topics

install-telepresence:
	telepresence helm install
connect: 
	telepresence quit && telepresence connect 

orch:
	cd orchestrator && go run . 
wrk:
	cd worker/scanner-worker && go run main.go

grb:
	cd worker/banner-worker && go run . 

meta:
	cd worker/enrich-meta-worker && go run . 

elastic:
	cd worker/elasticsearch-worker && go run . 

create-topics:
	@for topic in $(TOPICS); do \
	echo "Creating topic $$topic..."; \
	kubectl exec -n kafka redpanda-0 -- rpk topic create $$topic || echo "$$topic already exists"; \
	done


# If there was an unexpected issue with telepresence use this ma3reftx 3lax but it worked lol
#
# pkill -f telepresence
# sudo chown -R $USER:$USER /tmp/telepresence*
# sudo rm -f /var/run/telepresence-daemon.socket
# sudo rm -f /tmp/telepresence-*.sock
# sudo systemctl stop telepresence-root-daemon.service 2>/dev/null
# pkill -f telepresence
