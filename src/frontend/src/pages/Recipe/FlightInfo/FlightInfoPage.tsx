import { Box, HStack, Switch, Text, VStack } from "@chakra-ui/react";
import React from "react";
import { FaCoins, FaPlaneArrival, FaPlaneDeparture, FaTicketAlt } from "react-icons/fa";
import { NavigateFunction, Params } from "react-router-dom";

import RoundButton from "components/RoundButton/RoundButton";
import CreateTicket from "postAPI/tickets/Create";
import ProfileInfo from "postAPI/tickets/Me";
import GetFlight from "postAPI/flights/Get";
import { Flight as FlightT } from "types/Flight";

import styles from "./FlightsInfoPage.module.scss";

type State = {
    flight?: FlightT;
    useBonusPoints: boolean;
    bonusBalance: number;
    isBuying: boolean;
    purchaseError: string;
};

type RecipeInfoParams = {
    match: Readonly<Params<string>>;
    navigate: NavigateFunction;
};

const moneyFormatter = new Intl.NumberFormat("ru-RU");

const formatMoney = (value: number) => `${moneyFormatter.format(value)} ₽`;

const formatDate = (value?: string) => {
    if (!value) {
        return "Дата не указана";
    }

    const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
    const date = new Date(normalizedValue);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

class FlightInfoPage extends React.Component<RecipeInfoParams, State> {
    flightNumber: string;

    constructor(props) {
        super(props);
        this.flightNumber = this.props.match.flightNumber || "?";
        this.state = {
            useBonusPoints: false,
            bonusBalance: 0,
            isBuying: false,
            purchaseError: "",
        };
    }

    componentDidMount(): void {
        GetFlight(this.flightNumber).then(data => {
            if (data.status === 200) {
                this.setState({ flight: data.content });
            }
        });

        ProfileInfo()
            .then(response => {
                if (response.status === 200) {
                    this.setState({ bonusBalance: response.data.privilege?.balance || 0 });
                }
            })
            .catch(() => {
                this.setState({ bonusBalance: 0 });
            });
    }

    submit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!this.state.flight) {
            return;
        }
        if (this.state.flight.soldOut || this.state.flight.availableSeats <= 0) {
            this.setState({ purchaseError: "Все места выкуплены" });
            return;
        }

        const button = e.currentTarget;
        button.disabled = true;
        this.setState({ isBuying: true, purchaseError: "" });
        CreateTicket(this.state.flight.flightNumber, this.state.flight.price, this.state.useBonusPoints)
            .then(data => {
                if (data.status === 200) {
                    window.location.href = "/tickets";
                    return;
                }

                if (data.status === 409) {
                    this.setState(prev => ({
                        purchaseError: data.message || "Все места выкуплены",
                        flight: prev.flight ? { ...prev.flight, availableSeats: 0, soldOut: true } : prev.flight,
                    }));
                    return;
                }

                this.setState({ purchaseError: "Ошибка покупки билета" });
            })
            .catch(() => {
                this.setState({ purchaseError: "Ошибка покупки билета" });
            })
            .finally(() => {
                button.disabled = false;
                this.setState({ isBuying: false });
            });
    }

    handleToggle() {
        this.setState({ useBonusPoints: !this.state.useBonusPoints });
    }

    render() {
        const flight = this.state.flight;
        const availableSeats = flight?.availableSeats ?? 0;
        const isSoldOut = !!flight && (flight.soldOut || availableSeats <= 0);
        const bonusToUse = flight && this.state.useBonusPoints
            ? Math.min(this.state.bonusBalance, flight.price)
            : 0;
        const moneyToPay = flight ? flight.price - bonusToUse : 0;

        return (
            <VStack className={styles.main_box}>
                {flight && (
                    <Box className={styles.flight_card}>
                        <HStack className={styles.header_row}>
                            <Box>
                                <Text className={styles.overline}>Рейс {this.flightNumber}</Text>
                                <Text className={styles.title}>{flight.fromAirport} — {flight.toAirport}</Text>
                            </Box>
                            <Box className={styles.header_meta}>
                                <Box className={`${styles.seats_box} ${isSoldOut ? styles.seats_sold_out : ""}`}>
                                    <FaTicketAlt />
                                    <Text>{isSoldOut ? "Все места выкуплены" : `Осталось мест: ${availableSeats}`}</Text>
                                </Box>
                                <Box className={styles.price_box}>
                                    <Text>{formatMoney(flight.price)}</Text>
                                </Box>
                            </Box>
                        </HStack>

                        <Box className={styles.route_box}>
                            <Box className={styles.airport_box}>
                                <FaPlaneDeparture />
                                <Text className={styles.label}>Вылет</Text>
                                <Text className={styles.airport}>{flight.fromAirport}</Text>
                            </Box>
                            <Box className={styles.route_line}>
                                <span />
                                <Text>{formatDate(flight.date)}</Text>
                                <span />
                            </Box>
                            <Box className={styles.airport_box}>
                                <FaPlaneArrival />
                                <Text className={styles.label}>Прилет</Text>
                                <Text className={styles.airport}>{flight.toAirport}</Text>
                            </Box>
                        </Box>

                        <Box className={styles.payment_box}>
                            <HStack className={styles.bonus_row}>
                                <Box className={styles.bonus_title}>
                                    <FaCoins />
                                    <Box>
                                        <Text className={styles.bonus_label}>Использовать бонусные баллы</Text>
                                        <Text className={styles.bonus_hint}>Доступно {moneyFormatter.format(this.state.bonusBalance)} баллов</Text>
                                    </Box>
                                </Box>
                                <Switch
                                    isChecked={this.state.useBonusPoints}
                                    onChange={() => this.handleToggle()}
                                    colorScheme="teal"
                                    size="md"
                                />
                            </HStack>

                            <Box className={styles.payment_summary}>
                                <Text>Спишется бонусов: <b>{moneyFormatter.format(bonusToUse)}</b></Text>
                                <Text>К оплате деньгами: <b>{formatMoney(moneyToPay)}</b></Text>
                            </Box>
                        </Box>

                        {this.state.purchaseError && <Text className={styles.error_text}>{this.state.purchaseError}</Text>}

                        <RoundButton
                            className={styles.buy_button}
                            type="submit"
                            disabled={this.state.isBuying || isSoldOut}
                            onClick={event => this.submit(event)}
                        >
                            <FaTicketAlt />
                            {isSoldOut ? "Все места выкуплены" : this.state.isBuying ? "Оформляем..." : "Забронировать билет"}
                        </RoundButton>
                    </Box>
                )}
            </VStack>
        );
    }
}

export default FlightInfoPage;
