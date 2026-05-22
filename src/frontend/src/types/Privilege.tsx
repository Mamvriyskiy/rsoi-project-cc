import { Ticket } from "./Ticket";

export interface BalanceHistory {
    date: string;
    balanceDiff: number;
    ticketUid: string;
    operationType: string;
}

export interface Privilege {
    balance: number;
    status: string;
    history?: BalanceHistory[];
};

export interface UserInfo {
    tickets: Ticket[];
    privilege: Privilege;
}
