package models

import (
	"fmt"
	apperrors "gateway/errors"
	"io"
	"net/http"
	"sync"
	"time"
)

const (
	downstreamRequestTimeout = 5 * time.Second
	downstreamRetryAttempts  = 3
	downstreamRetryDelay     = 200 * time.Millisecond
	circuitFailureThreshold  = 3
	circuitResetTimeout      = 15 * time.Second
)

type circuitBreaker struct {
	service          string
	failureThreshold int
	resetTimeout     time.Duration

	mu        sync.Mutex
	failures  int
	openUntil time.Time
}

func newCircuitBreaker(service string) *circuitBreaker {
	return &circuitBreaker{
		service:          service,
		failureThreshold: circuitFailureThreshold,
		resetTimeout:     circuitResetTimeout,
	}
}

func (breaker *circuitBreaker) allow() error {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()

	if time.Now().Before(breaker.openUntil) {
		return apperrors.NewDependencyUnavailable(
			breaker.service,
			fmt.Errorf("circuit breaker is open until %s", breaker.openUntil.Format(time.RFC3339)),
		)
	}

	return nil
}

func (breaker *circuitBreaker) recordSuccess() {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()

	breaker.failures = 0
	breaker.openUntil = time.Time{}
}

func (breaker *circuitBreaker) recordFailure() {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()

	breaker.failures++
	if breaker.failures >= breaker.failureThreshold {
		breaker.openUntil = time.Now().Add(breaker.resetTimeout)
	}
}

type downstreamClient struct {
	service string
	client  *http.Client
	breaker *circuitBreaker
}

func newDownstreamClient(service string, client *http.Client) *downstreamClient {
	return &downstreamClient{
		service: service,
		client:  client,
		breaker: newCircuitBreaker(service),
	}
}

func (client *downstreamClient) Do(req *http.Request, retrySafe bool) (*http.Response, error) {
	if err := client.breaker.allow(); err != nil {
		return nil, err
	}

	attempts := 1
	if retrySafe {
		attempts = downstreamRetryAttempts
	}

	var lastErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		resp, err := client.client.Do(req)
		if err == nil && !(retrySafe && isRetryableStatus(resp.StatusCode) && attempt < attempts) {
			if isDependencyStatus(resp.StatusCode) {
				client.breaker.recordFailure()
			} else {
				client.breaker.recordSuccess()
			}
			return resp, nil
		}

		if err != nil {
			lastErr = err
		} else {
			lastErr = fmt.Errorf("retryable downstream status %d", resp.StatusCode)
			discardAndClose(resp.Body)
		}

		if attempt < attempts {
			time.Sleep(time.Duration(attempt) * downstreamRetryDelay)
		}
	}

	client.breaker.recordFailure()
	return nil, apperrors.NewDependencyUnavailable(client.service, lastErr)
}

func discardAndClose(body io.ReadCloser) {
	if body == nil {
		return
	}
	io.Copy(io.Discard, body)
	body.Close()
}

func isRetryableStatus(status int) bool {
	return status == http.StatusTooManyRequests ||
		status == http.StatusBadGateway ||
		status == http.StatusServiceUnavailable ||
		status == http.StatusGatewayTimeout ||
		status == http.StatusInternalServerError
}

func isDependencyStatus(status int) bool {
	return status == http.StatusTooManyRequests ||
		(status >= http.StatusInternalServerError && status <= 599)
}

func downstreamStatusError(service string, status int, body []byte) error {
	if isDependencyStatus(status) {
		return apperrors.NewDependencyUnavailable(service, fmt.Errorf("status %d: %s", status, string(body)))
	}

	return fmt.Errorf("%s returned %d: %s", service, status, string(body))
}
