export interface Flight {
    flightNumber: string;
    fromAirport: string;
    toAirport: string;
    date: string;
    price: number;
    availableSeats: number;
    soldOut: boolean;
}

export interface FlightCreatePayload {
    flightNumber: string;
    fromAirport: string;
    toAirport: string;
    date: string;
    price: number;
    availableSeats: number;
}
