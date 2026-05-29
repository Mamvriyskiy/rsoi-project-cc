import axiosBackend from "..";

interface resp {
    status: number
    message?: string
}

type Request = {
    flightNumber: string
    price: number
    paidFromBalance: boolean
}

const CreateTicket = async function(flight: string, price: number, fromBalance: boolean): Promise<resp> {
    let data: Request =  {
        flightNumber: flight,
        price: price,
        paidFromBalance: fromBalance,
    }
    try {
        const response = await axiosBackend.post(`/tickets`, data);
        return {
            status: response.status
        };
    } catch (error: any) {
        return {
            status: error?.response?.status || 500,
            message: error?.response?.data || "Ошибка покупки билета",
        };
    }
}
export default CreateTicket;
