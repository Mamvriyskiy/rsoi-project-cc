package models

import (
	apperrors "gateway/errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestDownstreamClientRetriesSafeRequests(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < downstreamRetryAttempts {
			http.Error(w, "temporary failure", http.StatusServiceUnavailable)
			return
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	httpClient := server.Client()
	httpClient.Timeout = downstreamRequestTimeout
	client := newDownstreamClient("test-service", httpClient)

	req, _ := http.NewRequest(http.MethodGet, server.URL, nil)
	resp, err := client.Do(req, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if attempts != downstreamRetryAttempts {
		t.Fatalf("expected %d attempts, got %d", downstreamRetryAttempts, attempts)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestDownstreamClientDoesNotRetryUnsafeRequests(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		http.Error(w, "temporary failure", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	httpClient := server.Client()
	httpClient.Timeout = downstreamRequestTimeout
	client := newDownstreamClient("test-service", httpClient)

	req, _ := http.NewRequest(http.MethodPost, server.URL, nil)
	resp, err := client.Do(req, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if attempts != 1 {
		t.Fatalf("expected 1 attempt, got %d", attempts)
	}
}

func TestDownstreamClientOpensCircuitAfterFailures(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		http.Error(w, "down", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	httpClient := server.Client()
	httpClient.Timeout = downstreamRequestTimeout
	client := newDownstreamClient("test-service", httpClient)
	client.breaker.resetTimeout = time.Minute

	for i := 0; i < circuitFailureThreshold; i++ {
		req, _ := http.NewRequest(http.MethodGet, server.URL, nil)
		resp, err := client.Do(req, false)
		if err != nil {
			t.Fatalf("unexpected error on failure %d: %v", i+1, err)
		}
		resp.Body.Close()
	}

	req, _ := http.NewRequest(http.MethodGet, server.URL, nil)
	_, err := client.Do(req, false)
	if !apperrors.IsDependencyUnavailable(err) {
		t.Fatalf("expected dependency unavailable error, got %v", err)
	}
	if attempts != circuitFailureThreshold {
		t.Fatalf("expected circuit to block extra request, got %d attempts", attempts)
	}
}
