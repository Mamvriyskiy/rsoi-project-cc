import axiosBackend from "..";
import { Flight, FlightCreatePayload } from "types/Flight";

interface resp {
    status: number;
    content: Flight;
}

const CreateFlight = async function(data: FlightCreatePayload): Promise<resp> {
    const response = await axiosBackend.post("/flights", data);
    return {
        status: response.status,
        content: response.data as Flight,
    };
};

export default CreateFlight;
