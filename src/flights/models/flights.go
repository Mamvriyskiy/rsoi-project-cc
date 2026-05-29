package models

import (
	"flights/errors"
	"flights/objects"
	"flights/repository"
	"strings"
)

type FlightsM struct {
	rep repository.FlightsRep
}

func NewFlightsM(rep repository.FlightsRep) *FlightsM {
	return &FlightsM{rep}
}

func (model *FlightsM) GetAll(page int, page_size int) []objects.Flight {
	return model.rep.GetAll(page, page_size)
}

func (model *FlightsM) Find(flight_number string) (*objects.Flight, error) {
	flight, err := model.rep.Find(flight_number)
	if err != nil {
		return nil, errors.RecordNotFound
	} else {
		return flight, nil
	}
}

func (model *FlightsM) Create(req *objects.CreateRequest) (*objects.Flight, error) {
	if req == nil ||
		strings.TrimSpace(req.FlightNumber) == "" ||
		strings.TrimSpace(req.FromAirport) == "" ||
		strings.TrimSpace(req.ToAirport) == "" ||
		strings.TrimSpace(req.Date) == "" ||
		req.Price <= 0 ||
		req.AvailableSeats < 0 {
		return nil, errors.InvalidRequest
	}

	return model.rep.Create(req)
}

func (model *FlightsM) ReserveSeat(flight_number string) (*objects.Flight, error) {
	flight, err := model.rep.ReserveSeat(flight_number)
	if err != nil {
		return nil, err
	}

	return flight, nil
}

func (model *FlightsM) ReleaseSeat(flight_number string) (*objects.Flight, error) {
	flight, err := model.rep.ReleaseSeat(flight_number)
	if err != nil {
		return nil, err
	}

	return flight, nil
}
