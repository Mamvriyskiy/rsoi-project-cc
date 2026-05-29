package repository

import (
	"flights/errors"
	"flights/objects"
	"strings"

	"github.com/jinzhu/gorm"
)

type FlightsRep interface {
	GetAll(page int, page_size int) []objects.Flight
	Find(flight_number string) (*objects.Flight, error)
	Create(req *objects.CreateRequest) (*objects.Flight, error)
	ReserveSeat(flight_number string) (*objects.Flight, error)
	ReleaseSeat(flight_number string) (*objects.Flight, error)
}

type PGFlightsRep struct {
	db *gorm.DB
}

func NewPGFlightsRep(db *gorm.DB) *PGFlightsRep {
	return &PGFlightsRep{db}
}

func paginate(page int, page_size int) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if page < 1 {
			page = 1
		}
		if page_size <= 0 {
			page_size = 20
		}
		offset := (page - 1) * page_size
		return db.Offset(offset).Limit(page_size)
	}
}

func (rep *PGFlightsRep) GetAll(page int, page_size int) []objects.Flight {
	temp := []objects.Flight{}
	rep.db.
		Scopes(paginate(page, page_size)).
		Model(&objects.Flight{}).
		Preload("FromAirport").
		Preload("ToAirport").
		Find(&temp)

	return temp
}

func (rep *PGFlightsRep) Find(flight_number string) (*objects.Flight, error) {
	temp := new(objects.Flight)
	err := rep.db.
		Where(&objects.Flight{FlightNumber: flight_number}).
		Preload("FromAirport").
		Preload("ToAirport").
		First(temp).
		Error
	switch err {
	case nil:
		break
	case gorm.ErrRecordNotFound:
		temp, err = nil, errors.RecordNotFound
	default:
		temp, err = nil, errors.UnknownError
	}

	return temp, err
}

func splitAirportName(value string) (string, string) {
	parts := strings.Fields(value)
	if len(parts) == 0 {
		return "", ""
	}
	if len(parts) == 1 {
		return parts[0], parts[0]
	}

	return parts[0], strings.Join(parts[1:], " ")
}

func (rep *PGFlightsRep) findOrCreateAirport(tx *gorm.DB, value string) (*objects.Airport, error) {
	city, name := splitAirportName(value)
	if city == "" || name == "" {
		return nil, errors.InvalidRequest
	}

	airport := &objects.Airport{}
	err := tx.Where(&objects.Airport{City: city, Name: name}).First(airport).Error
	switch err {
	case nil:
		return airport, nil
	case gorm.ErrRecordNotFound:
		airport = &objects.Airport{City: city, Name: name, Country: "Россия"}
		return airport, tx.Create(airport).Error
	default:
		return nil, errors.UnknownError
	}
}

func (rep *PGFlightsRep) Create(req *objects.CreateRequest) (*objects.Flight, error) {
	tx := rep.db.Begin()
	if tx.Error != nil {
		return nil, errors.UnknownError
	}

	fromAirport, err := rep.findOrCreateAirport(tx, req.FromAirport)
	if err != nil {
		tx.Rollback()
		return nil, err
	}
	toAirport, err := rep.findOrCreateAirport(tx, req.ToAirport)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	flight := &objects.Flight{
		FlightNumber:   req.FlightNumber,
		Datetime:       req.Date,
		FromAirportID:  fromAirport.Id,
		ToAirportID:    toAirport.Id,
		Price:          req.Price,
		AvailableSeats: req.AvailableSeats,
	}
	if err = tx.Create(flight).Error; err != nil {
		tx.Rollback()
		return nil, errors.DBAdditionError
	}
	if err = tx.Commit().Error; err != nil {
		return nil, errors.UnknownError
	}

	return rep.Find(flight.FlightNumber)
}

func (rep *PGFlightsRep) ReserveSeat(flight_number string) (*objects.Flight, error) {
	update := rep.db.
		Model(&objects.Flight{}).
		Where("flight_number = ? AND available_seats > 0", flight_number).
		UpdateColumn("available_seats", gorm.Expr("available_seats - ?", 1))
	if update.Error != nil {
		return nil, errors.UnknownError
	}
	if update.RowsAffected == 0 {
		flight, err := rep.Find(flight_number)
		if err != nil {
			return nil, err
		}
		if flight.AvailableSeats <= 0 {
			return nil, errors.NoSeatsAvailable
		}
		return nil, errors.UnknownError
	}

	return rep.Find(flight_number)
}

func (rep *PGFlightsRep) ReleaseSeat(flight_number string) (*objects.Flight, error) {
	update := rep.db.
		Model(&objects.Flight{}).
		Where("flight_number = ?", flight_number).
		UpdateColumn("available_seats", gorm.Expr("available_seats + ?", 1))
	if update.Error != nil {
		return nil, errors.UnknownError
	}
	if update.RowsAffected == 0 {
		return nil, errors.RecordNotFound
	}

	return rep.Find(flight_number)
}
