package models

import (
	"bytes"
	"encoding/json"
	stderrors "errors"
	"fmt"
	"gateway/objects"
	"gateway/utils"
	"io/ioutil"
	"log"
	"net/http"
)

type PrivilegesM struct {
	client *downstreamClient
}

func NewPrivilegesM(client *http.Client) *PrivilegesM {
	return &PrivilegesM{client: newDownstreamClient("privileges-service", client)}
}

func (model *PrivilegesM) NewPrivilege(user string, authHeader string) error {
	req_body := &objects.AddPrivilegeRequest{User: user, Status: "BRONZE"}
	log.Printf("creating new privilege: %v", req_body)
	req_raw_body, _ := json.Marshal(req_body)
	req, _ := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/api/v1/privilege", utils.Config.Endpoints.Privileges),
		bytes.NewBuffer(req_raw_body),
	)
	req.Header.Add("Authorization", authHeader)

	resp, err := model.client.Do(req, false)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusCreated {
		if isDependencyStatus(resp.StatusCode) {
			return downstreamStatusError("privileges-service", resp.StatusCode, body)
		}
		return stderrors.New(string(body))
	}
	return nil
}

func (model *PrivilegesM) Fetch(authHeader string) (*objects.PrivilegeInfoResponse, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/privilege", utils.Config.Endpoints.Privileges), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data := &objects.PrivilegeInfoResponse{}
	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("privileges-service", resp.StatusCode, body)
	}
	if err := json.Unmarshal(body, data); err != nil {
		return nil, err
	}
	return data, nil
}

func (model *PrivilegesM) AddTicket(authHeader string, request *objects.AddHistoryRequest) (*objects.AddHistoryResponce, error) {
	req_body, _ := json.Marshal(request)
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/history", utils.Config.Endpoints.Privileges), bytes.NewBuffer(req_body))
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, false)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data := &objects.AddHistoryResponce{}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("privileges-service", resp.StatusCode, body)
	}
	if err := json.Unmarshal(body, data); err != nil {
		return nil, err
	}
	return data, nil
}

func (model *PrivilegesM) DeleteTicket(authHeader string, ticket_uid string) error {
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("%s/api/v1/history/%s", utils.Config.Endpoints.Privileges, ticket_uid), nil)
	req.Header.Add("Authorization", authHeader)
	resp, err := model.client.Do(req, false)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		body, _ := ioutil.ReadAll(resp.Body)
		return downstreamStatusError("privileges-service", resp.StatusCode, body)
	}
	return nil
}
