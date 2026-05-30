package errors

import (
	stderrors "errors"
	"fmt"
)

var (
	FlightNotFound        = stderrors.New("Flight is not found")
	ForbiddenTicket       = stderrors.New("Forbidden ticket for this user")
	NoSeatsAvailable      = stderrors.New("No seats available")
	DependencyUnavailable = stderrors.New("dependency unavailable")
)

type DownstreamError struct {
	Service string
	Err     error
}

func (err *DownstreamError) Error() string {
	if err == nil {
		return DependencyUnavailable.Error()
	}
	if err.Err == nil {
		return fmt.Sprintf("%s unavailable", err.Service)
	}
	return fmt.Sprintf("%s unavailable: %s", err.Service, err.Err.Error())
}

func (err *DownstreamError) Unwrap() error {
	if err == nil || err.Err == nil {
		return DependencyUnavailable
	}
	return err.Err
}

func (err *DownstreamError) Is(target error) bool {
	return target == DependencyUnavailable
}

func NewDependencyUnavailable(service string, err error) error {
	return &DownstreamError{Service: service, Err: err}
}

func IsDependencyUnavailable(err error) bool {
	return stderrors.Is(err, DependencyUnavailable)
}
