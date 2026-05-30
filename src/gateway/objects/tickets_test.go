package objects

import "testing"

func TestNewTicketPurchaseResponseWithoutPrivilege(t *testing.T) {
	flight := &FlightResponse{
		FlightNumber: "SU-100",
		FromAirport:  "SVO",
		ToAirport:    "LED",
		Date:         "2026-05-30T12:00:00Z",
		Price:        12000,
	}
	ticket := &TicketCreateResponse{
		TicketUid:    "ticket-1",
		FlightNumber: flight.FlightNumber,
		Status:       "PAID",
	}

	response := NewTicketPurchaseResponse(flight, ticket, nil)

	if response.PaidByMoney != flight.Price {
		t.Fatalf("expected full money payment, got %d", response.PaidByMoney)
	}
	if response.PaidByBonuses != 0 {
		t.Fatalf("expected no bonus payment, got %d", response.PaidByBonuses)
	}
	if response.Privilege.Status != "" || response.Privilege.Balance != 0 {
		t.Fatalf("expected empty privilege info, got %+v", response.Privilege)
	}
}
