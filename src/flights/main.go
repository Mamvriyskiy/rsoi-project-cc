package main

import (
	"flights/controllers"
	"flights/objects"
	"flights/utils"
	"log"

	"fmt"
	"math/rand"
	"time"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
)

func initDBConnection(cnf utils.DBConfiguration) *gorm.DB {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cnf.Host, cnf.User, cnf.Password, cnf.Name, cnf.Port)
	db, e := gorm.Open(cnf.Type, dsn)

	if e != nil {
		utils.Logger.Print("DB Connection failed")
		utils.Logger.Print(e)
		panic("DB Connection failed")
	} else {
		utils.Logger.Print("DB Connection Established")
	}

	db.SingularTable(true)
	db.AutoMigrate(&objects.Airport{})
	db.AutoMigrate(&objects.Flight{})

	airports := []objects.Airport{
		{Id: 1, Name: "Шереметьево", City: "Москва", Country: "Россия"},
		{Id: 2, Name: "Пулково", City: "Санкт-Петербург", Country: "Россия"},
		{Id: 3, Name: "Казань", City: "Казань", Country: "Россия"},
		{Id: 4, Name: "Сочи", City: "Сочи", Country: "Россия"},
		{Id: 5, Name: "Толмачёво", City: "Новосибирск", Country: "Россия"},
		{Id: 6, Name: "Кольцово", City: "Екатеринбург", Country: "Россия"},
		{Id: 7, Name: "Пашковский", City: "Краснодар", Country: "Россия"},
		{Id: 8, Name: "Храброво", City: "Калининград", Country: "Россия"},
	}
	for _, airport := range airports {
		db.Save(&airport)
	}

	flights := []objects.Flight{
		{Id: 1, FlightNumber: "AFL031", Datetime: "2026-06-03 20:00", FromAirportID: 2, ToAirportID: 1, Price: 1500},
		{Id: 2, FlightNumber: "SBI117", Datetime: "2026-06-04 09:30", FromAirportID: 1, ToAirportID: 4, Price: 6200},
		{Id: 3, FlightNumber: "DP408", Datetime: "2026-06-05 12:15", FromAirportID: 4, ToAirportID: 1, Price: 5800},
		{Id: 4, FlightNumber: "AFL204", Datetime: "2026-06-06 07:45", FromAirportID: 1, ToAirportID: 3, Price: 3400},
		{Id: 5, FlightNumber: "U6132", Datetime: "2026-06-07 18:20", FromAirportID: 3, ToAirportID: 6, Price: 4100},
		{Id: 6, FlightNumber: "SBI532", Datetime: "2026-06-08 22:10", FromAirportID: 6, ToAirportID: 5, Price: 7600},
		{Id: 7, FlightNumber: "AFL770", Datetime: "2026-06-09 10:05", FromAirportID: 5, ToAirportID: 2, Price: 8900},
		{Id: 8, FlightNumber: "DP219", Datetime: "2026-06-10 16:40", FromAirportID: 2, ToAirportID: 4, Price: 7200},
		{Id: 9, FlightNumber: "S7018", Datetime: "2026-06-11 08:10", FromAirportID: 1, ToAirportID: 8, Price: 5400},
		{Id: 10, FlightNumber: "AFL512", Datetime: "2026-06-12 14:55", FromAirportID: 8, ToAirportID: 2, Price: 6100},
		{Id: 11, FlightNumber: "DP344", Datetime: "2026-06-13 11:25", FromAirportID: 7, ToAirportID: 1, Price: 4900},
		{Id: 12, FlightNumber: "U6406", Datetime: "2026-06-14 19:35", FromAirportID: 1, ToAirportID: 7, Price: 5300},
		{Id: 13, FlightNumber: "SBI884", Datetime: "2026-06-15 06:50", FromAirportID: 5, ToAirportID: 4, Price: 9800},
		{Id: 14, FlightNumber: "AFL955", Datetime: "2026-06-16 21:15", FromAirportID: 4, ToAirportID: 8, Price: 8700},
	}
	for _, flight := range flights {
		db.Save(&flight)
	}
	db.Exec("SELECT setval(pg_get_serial_sequence('airport', 'id'), COALESCE((SELECT MAX(id) FROM airport), 1), true)")
	db.Exec("SELECT setval(pg_get_serial_sequence('flight', 'id'), COALESCE((SELECT MAX(id) FROM flight), 1), true)")

	return db
}

func main() {
	rand.Seed(time.Now().UnixNano())

	utils.InitConfig()
	utils.InitLogger()
	defer utils.CloseLogger()

	db := initDBConnection(utils.Config.DB)
	defer db.Close()
	r := controllers.InitRouter(db)

	utils.Logger.Print("Server started")
	log.Printf("Server is running on http://localhost:%d\n", utils.Config.Port)
	code := controllers.RunRouter(r, utils.Config.Port)

	utils.Logger.Printf("Server ended with code %s", code)
}
