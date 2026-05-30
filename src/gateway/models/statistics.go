package models

import (
	"encoding/json"
	"fmt"
	"gateway/objects"
	"gateway/utils"
	"io/ioutil"
	"net/http"
	"time"
)

type StatisticsM struct {
	client *downstreamClient
}

func NewStatisticsM(client *http.Client) *StatisticsM {
	return &StatisticsM{client: newDownstreamClient("statistics-service", client)}
}

func (model *StatisticsM) Fetch(beginTime time.Time, endTime time.Time, authHeader string) (*objects.FetchResponse, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/v1/requests", utils.Config.Endpoints.Statistics), nil)
	q := req.URL.Query()
	q.Add("begin_time", beginTime.Format(time.RFC3339))
	q.Add("end_time", endTime.Format(time.RFC3339))
	req.URL.RawQuery = q.Encode()
	req.Header.Add("Authorization", authHeader)

	resp, err := model.client.Do(req, true)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, downstreamStatusError("statistics-service", resp.StatusCode, body)
	}

	data := &objects.FetchResponse{}
	if err := json.Unmarshal(body, data); err != nil {
		return nil, err
	}
	return data, nil
}
