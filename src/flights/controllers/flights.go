package controllers

import (
	"encoding/json"
	"flights/controllers/responses"
	"flights/errors"
	"flights/models"
	"flights/objects"
	"log"

	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type flightCtrl struct {
	model *models.FlightsM
}

func InitFlights(r *mux.Router, model *models.FlightsM) {
	ctrl := &flightCtrl{model}
	r.HandleFunc("/flights", ctrl.getAll).Methods("GET")
	r.HandleFunc("/flights", ctrl.create).Methods("POST")
	r.HandleFunc("/flights/{flightNumber}", ctrl.get).Methods("GET")
	r.HandleFunc("/flights/{flightNumber}/reserve", ctrl.reserve).Methods("POST")
	r.HandleFunc("/flights/{flightNumber}/release", ctrl.release).Methods("POST")
}

func (ctrl *flightCtrl) getAll(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query()
	page, _ := strconv.Atoi(queryParams.Get("page"))
	page_size, _ := strconv.Atoi(queryParams.Get("size"))
	items := ctrl.model.GetAll(page, page_size)

	log.Printf("Get All flights %v\n", items)

	data := &objects.PaginationResponse{
		Page:          page,
		PageSize:      page_size,
		TotalElements: len(items),
		Items:         objects.ToFilghtResponses(items),
	}

	responses.JsonSuccess(w, data)
}

func (ctrl *flightCtrl) get(w http.ResponseWriter, r *http.Request) {
	urlParams := mux.Vars(r)
	flight_number := urlParams["flightNumber"]

	data, err := ctrl.model.Find(flight_number)
	switch err {
	case nil:
		responses.JsonSuccess(w, data.ToFilghtResponse())
	case errors.RecordNotFound:
		responses.RecordNotFound(w, flight_number)
	default:
		responses.InternalError(w)
	}
}

func (ctrl *flightCtrl) create(w http.ResponseWriter, r *http.Request) {
	req_body := new(objects.CreateRequest)
	if err := json.NewDecoder(r.Body).Decode(req_body); err != nil {
		responses.BadRequest(w, err.Error())
		return
	}

	data, err := ctrl.model.Create(req_body)
	switch err {
	case nil:
		responses.JsonSuccess(w, data.ToFilghtResponse())
	case errors.InvalidRequest:
		responses.ValidationErrorResponse(w)
	default:
		responses.InternalError(w)
	}
}

func (ctrl *flightCtrl) reserve(w http.ResponseWriter, r *http.Request) {
	urlParams := mux.Vars(r)
	flight_number := urlParams["flightNumber"]

	data, err := ctrl.model.ReserveSeat(flight_number)
	switch err {
	case nil:
		responses.JsonSuccess(w, data.ToFilghtResponse())
	case errors.RecordNotFound:
		responses.RecordNotFound(w, flight_number)
	case errors.NoSeatsAvailable:
		responses.Conflict(w, "Все места выкуплены")
	default:
		responses.InternalError(w)
	}
}

func (ctrl *flightCtrl) release(w http.ResponseWriter, r *http.Request) {
	urlParams := mux.Vars(r)
	flight_number := urlParams["flightNumber"]

	data, err := ctrl.model.ReleaseSeat(flight_number)
	switch err {
	case nil:
		responses.JsonSuccess(w, data.ToFilghtResponse())
	case errors.RecordNotFound:
		responses.RecordNotFound(w, flight_number)
	default:
		responses.InternalError(w)
	}
}
