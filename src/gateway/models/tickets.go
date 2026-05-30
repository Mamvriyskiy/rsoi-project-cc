package models

import (
	"bytes"
	"encoding/json"
	"fmt"
	"gateway/errors"
	"gateway/objects"
	"gateway/utils"
	"io/ioutil"
	"net/http"
)

type TicketsM struct {
	client *downstreamClient

	flights    *FlightsM
	privileges *PrivilegesM
}

func NewTicketsM(client *http.Client, flights *FlightsM, privileges *PrivilegesM) *TicketsM {
	return &TicketsM{
		client:     newDownstreamClient("tickets-service", client),
		flights:    flights,
		privileges: privileges,
	}
}

func (model *TicketsM) FetchUser(authHeader string) (*objects.UserInfoResponse, error) {
	data := new(objects.UserInfoResponse)
	tickets, err := model.fetch(authHeader)
	if err != nil {
		return nil, err
	}
	flights, err := model.flights.Fetch(1, 100, authHeader)
	if err != nil {
		return nil, err
	}
	data.Tickets = objects.MakeTicketResponseArr(tickets, flights.Items)

	privilege, err := model.privileges.Fetch(authHeader)
	if err != nil {
		return nil, err
	}
	data.Privilege = objects.PrivilegeInfoResponse{
		Balance: privilege.Balance,
		Status:  privilege.Status,
		History: privilege.History,
	}
	return data, nil
}

func (model *TicketsM) fetch(authHeader string) (objects.TicketArr, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/tickets", utils.Config.Endpoints.Tickets), nil)
	req.Header.Set("Authorization", authHeader)
	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data := new(objects.TicketArr)
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("tickets-service", resp.StatusCode, body)
	}

	if err := json.Unmarshal(body, data); err != nil {
		return nil, err
	}
	return *data, nil
}

func (model *TicketsM) Fetch(authHeader string) ([]objects.TicketResponse, error) {
	tickets, err := model.fetch(authHeader)
	if err != nil {
		return nil, err
	}

	flights, err := model.flights.Fetch(1, 100, authHeader)
	if err != nil {
		return nil, err
	}
	return objects.MakeTicketResponseArr(tickets, flights.Items), nil
}

func (model *TicketsM) create(flight_number string, price int, authHeader string) (*objects.TicketCreateResponse, error) {
	req_body, _ := json.Marshal(&objects.TicketCreateRequest{FlightNumber: flight_number, Price: price})
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/tickets", utils.Config.Endpoints.Tickets), bytes.NewBuffer(req_body))
	req.Header.Add("Authorization", authHeader)

	if resp, err := model.client.Do(req, false); err != nil {
		return nil, err
	} else {
		defer resp.Body.Close()
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusOK {
			return nil, downstreamStatusError("tickets-service", resp.StatusCode, body)
		}

		data := &objects.TicketCreateResponse{}
		if err := json.Unmarshal(body, data); err != nil {
			return nil, err
		}
		if data.TicketUid == "" {
			return nil, fmt.Errorf("tickets service returned empty ticket uid")
		}
		return data, nil
	}
}

func (model *TicketsM) Create(flight_number string, authHeader string, price int, from_balance bool) (*objects.TicketPurchaseResponse, error) {
	flight, err := model.flights.ReserveSeat(flight_number, authHeader)
	if err != nil {
		utils.Logger.Println(err.Error())
		return nil, err
	}

	ticket, err := model.create(flight_number, flight.Price, authHeader)
	if err != nil {
		utils.Logger.Println(err.Error())
		if _, releaseErr := model.flights.ReleaseSeat(flight_number, authHeader); releaseErr != nil {
			utils.Logger.Println(releaseErr.Error())
		}
		return nil, err
	}

	privilege, err := model.privileges.AddTicket(authHeader, &objects.AddHistoryRequest{
		TicketUID:       ticket.TicketUid,
		Price:           flight.Price,
		PaidFromBalance: from_balance,
	})
	if err != nil {
		utils.Logger.Println(err.Error())
		if !from_balance {
			utils.Logger.Printf("privileges-service failed after ticket %s was created; purchase is kept because bonus payment was not used", ticket.TicketUid)
			return objects.NewTicketPurchaseResponse(flight, ticket, nil), nil
		}

		if deleteErr := model.delete(ticket.TicketUid, authHeader); deleteErr != nil {
			utils.Logger.Println(deleteErr.Error())
		}
		if _, releaseErr := model.flights.ReleaseSeat(flight_number, authHeader); releaseErr != nil {
			utils.Logger.Println(releaseErr.Error())
		}
		return nil, err
	}

	return objects.NewTicketPurchaseResponse(flight, ticket, privilege), nil
}

func (model *TicketsM) find(ticket_uid string, authHeader string) (*objects.Ticket, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/tickets/%s", utils.Config.Endpoints.Tickets, ticket_uid), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	} else {
		defer resp.Body.Close()
		data := &objects.Ticket{}
		body, _ := ioutil.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			return nil, downstreamStatusError("tickets-service", resp.StatusCode, body)
		}
		if err := json.Unmarshal(body, data); err != nil {
			return nil, err
		}
		return data, nil
	}
}

func (model *TicketsM) Find(ticket_uid string, username string, authHeader string) (*objects.TicketResponse, error) {
	ticket, err := model.find(ticket_uid, authHeader)
	if err != nil {
		return nil, err
	} else if username != ticket.Username {
		return nil, errors.ForbiddenTicket
	}

	flight, err := model.flights.Find(ticket.FlightNumber, authHeader)
	if err != nil {
		return nil, err
	} else {
		return objects.ToTicketResponce(ticket, flight), nil
	}
}

func (model *TicketsM) delete(ticket_uid string, authHeader string) error {
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/v1/tickets/%s", utils.Config.Endpoints.Tickets, ticket_uid), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, false)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := ioutil.ReadAll(resp.Body)
		return downstreamStatusError("tickets-service", resp.StatusCode, body)
	}
	return nil
}

func (model *TicketsM) Delete(ticket_uid string, username string, authHeader string) error {
	ticket, err := model.find(ticket_uid, authHeader)
	if err != nil {
		return err
	} else if username != ticket.Username {
		return errors.ForbiddenTicket
	}
	if ticket.Status == "CANCELED" {
		return nil
	}

	if err = model.delete(ticket_uid, authHeader); err != nil {
		return err
	}
	if _, err = model.flights.ReleaseSeat(ticket.FlightNumber, authHeader); err != nil {
		return err
	}

	return model.privileges.DeleteTicket(authHeader, ticket_uid)
}
