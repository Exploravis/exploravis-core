TOPICS := ip_scan_request scan_enrichment_request finished_scan ip_scan_result not_enriched_finished_scan
.PHONY: create-topics

install-telepresence:
	telepresence helm install
connect: 
	telepresence quit && telepresence connect 
orch:
	cd orchestrator && go run . 
wrk:
	cd worker && go run main.go

grb:
	cd worker/banner && go run . 

meta:
	cd worker/enrich-meta && go run . 

elastic:
	cd worker/elasticsearch-worker && go run . 

create-topics:
	@for topic in $(TOPICS); do \
	echo "Creating topic $$topic..."; \
	kubectl exec -n kafka redpanda-0 -- rpk topic create $$topic || echo "$$topic already exists"; \
	done
