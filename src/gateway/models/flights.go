package models

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"gateway/errors"
	"gateway/objects"
	"gateway/utils"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"
)

type FlightsM struct {
	client *http.Client
}

func NewFlightsM(client *http.Client) *FlightsM {
	return &FlightsM{client: client}
}

func (model *FlightsM) Fetch(page int, page_size int, authHeader string) *objects.PaginationResponse {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/flights", utils.Config.Endpoints.Flights), nil)
	q := req.URL.Query()
	q.Add("page", fmt.Sprintf("%d", page))
	q.Add("size", fmt.Sprintf("%d", page_size))
	req.URL.RawQuery = q.Encode()
	req.Header.Add("Authorization", authHeader)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic("client: error making http request\n")
	}

	data := &objects.PaginationResponse{}
	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, data)

	log.Printf("flights: %v", data)
	return data
}

func (model *FlightsM) Find(flight_number string, authHeader string) (*objects.FlightResponse, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/flights/%s", utils.Config.Endpoints.Flights, url.PathEscape(flight_number)), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.FlightNotFound
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("flights service returned %d: %s", resp.StatusCode, string(body))
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

	resp, err := model.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("flights service returned %d: %s", resp.StatusCode, string(body))
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

	resp, err := model.client.Do(req)
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
		return nil, fmt.Errorf("flights service returned %d: %s", resp.StatusCode, string(body))
	}
}
