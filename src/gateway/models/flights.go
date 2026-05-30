package models

import (
	"bytes"
	"encoding/json"
	"fmt"
	"gateway/errors"
	"gateway/objects"
	"gateway/utils"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
)

type FlightsM struct {
	client *downstreamClient
}

func NewFlightsM(client *http.Client) *FlightsM {
	return &FlightsM{client: newDownstreamClient("flights-service", client)}
}

func (model *FlightsM) Fetch(page int, page_size int, authHeader string) (*objects.PaginationResponse, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/flights", utils.Config.Endpoints.Flights), nil)
	q := req.URL.Query()
	q.Add("page", fmt.Sprintf("%d", page))
	q.Add("size", fmt.Sprintf("%d", page_size))
	req.URL.RawQuery = q.Encode()
	req.Header.Add("Authorization", authHeader)

	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("flights-service", resp.StatusCode, body)
	}

	data := &objects.PaginationResponse{}
	if err := json.Unmarshal(body, data); err != nil {
		return nil, err
	}

	log.Printf("flights: %v", data)
	return data, nil
}

func (model *FlightsM) Find(flight_number string, authHeader string) (*objects.FlightResponse, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/flights/%s", utils.Config.Endpoints.Flights, url.PathEscape(flight_number)), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.FlightNotFound
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, downstreamStatusError("flights-service", resp.StatusCode, body)
	}

	data := &objects.FlightResponse{}
	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, data)
	return data, nil
}

func (model *FlightsM) Create(flight *objects.FlightCreateRequest, authHeader string) (*objects.FlightResponse, error) {
	req_body, _ := json.Marshal(flight)
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/flights", utils.Config.Endpoints.Flights), bytes.NewBuffer(req_body))
	req.Header.Add("Authorization", authHeader)
	req.Header.Add("Content-Type", "application/json")

	resp, err := model.client.Do(req, false)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("flights-service", resp.StatusCode, body)
	}

	data := &objects.FlightResponse{}
	json.Unmarshal(body, data)
	return data, nil
}

func (model *FlightsM) ReserveSeat(flight_number string, authHeader string) (*objects.FlightResponse, error) {
	return model.updateSeat(flight_number, authHeader, "reserve")
}

func (model *FlightsM) ReleaseSeat(flight_number string, authHeader string) (*objects.FlightResponse, error) {
	return model.updateSeat(flight_number, authHeader, "release")
}

func (model *FlightsM) updateSeat(flight_number string, authHeader string, action string) (*objects.FlightResponse, error) {
	req, _ := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/api/v1/flights/%s/%s", utils.Config.Endpoints.Flights, url.PathEscape(flight_number), action),
		nil,
	)
	req.Header.Add("Authorization", authHeader)

	resp, err := model.client.Do(req, false)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		data := &objects.FlightResponse{}
		body, _ := ioutil.ReadAll(resp.Body)
		json.Unmarshal(body, data)
		return data, nil
	case http.StatusNotFound:
		return nil, errors.FlightNotFound
	case http.StatusConflict:
		return nil, errors.NoSeatsAvailable
	default:
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, downstreamStatusError("flights-service", resp.StatusCode, body)
	}
}
