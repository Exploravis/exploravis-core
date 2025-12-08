package main

import (
	"context"
	"fmt"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

func getClusterNodes(host, token, caPath string) ([]map[string]interface{}, error) {
	config := &rest.Config{
		Host:            host,
		BearerToken:     token,
		Timeout:         10 * time.Second,
		TLSClientConfig: rest.TLSClientConfig{},
	}

	if caPath != "" {
		config.TLSClientConfig.CAFile = caPath
	} else {
		config.TLSClientConfig.Insecure = true
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	results := make([]map[string]interface{}, 0)
	for _, node := range nodes.Items {
		internalIP := getAddressByType(node.Status.Addresses, v1.NodeInternalIP)
		externalIP := getAddressByType(node.Status.Addresses, v1.NodeExternalIP)

		status := getNodeReadyStatus(node.Status.Conditions)

		nodeInfo := map[string]interface{}{
			"name":            node.Name,
			"status":          status,
			"internal_ip":     internalIP,
			"external_ip":     externalIP,
			"capacity_cpu":    node.Status.Capacity.Cpu().String(),
			"capacity_memory": node.Status.Capacity.Memory().String(),
			"node":            node,
		}
		results = append(results, nodeInfo)
	}

	return results, nil
}

func getAddressByType(addresses []v1.NodeAddress, addressType v1.NodeAddressType) string {
	for _, addr := range addresses {
		if addr.Type == addressType {
			return addr.Address
		}
	}
	return "N/A"
}

func getNodeReadyStatus(conditions []v1.NodeCondition) string {
	for _, condition := range conditions {
		if condition.Type == v1.NodeReady {
			return string(condition.Status)
		}
	}
	return "Unknown"
}
