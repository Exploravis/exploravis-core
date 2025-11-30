install-telepresence:
	telepresence helm install
connect: 
	telepresence connect
orch:
	cd orchestrator && go run main.go
worker:
	cd worker && go run main.go

