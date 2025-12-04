TOPICS := ip_scan_request scan_enrichment_request finished_scan ip_scan_result
.PHONY: create-topics

install-telepresence:
	telepresence helm install
connect: 
	telepresence quit && telepresence connect 
orch:
	cd orchestrator && go run main.go
wrk:
	cd worker && go run main.go

grb:
	cd worker/banner && go run main.go
create-topics:
	@for topic in $(TOPICS); do \
	echo "Creating topic $$topic..."; \
	kubectl exec -n kafka redpanda-0 -- rpk topic create $$topic || echo "$$topic already exists"; \
	done
