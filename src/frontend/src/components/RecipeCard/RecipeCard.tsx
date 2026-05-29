import { Box, Link, Text } from "@chakra-ui/react";
import React from "react";
import { FaCalendarAlt, FaPlaneDeparture, FaRubleSign, FaTicketAlt } from "react-icons/fa";

import { Flight as FlightI } from "types/Flight";

import styles from "./RecipeCard.module.scss";

interface FlightProps extends FlightI {}

const moneyFormatter = new Intl.NumberFormat("ru-RU");

const formatPrice = (price: number) => `${moneyFormatter.format(price)} ₽`;

const formatDate = (value: string) => {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const RecipeCard: React.FC<FlightProps> = (props) => {
  const path = `/flights/${props.flightNumber}`;
  const availableSeats = props.availableSeats ?? 0;
  const isSoldOut = props.soldOut || availableSeats <= 0;

  return (
    <Link className={styles.link_div} href={path}>
      <Box className={`${styles.main_box} ${isSoldOut ? styles.sold_out : ""}`}>
        <Box className={styles.card_header}>
          <Text className={styles.flight_number}>{props.flightNumber}</Text>
          <Box className={styles.price_badge}>
            <FaRubleSign />
            <Text>{formatPrice(props.price)}</Text>
          </Box>
        </Box>

        <Box className={styles.route_box}>
          <Box className={styles.airport_block}>
            <Text className={styles.label}>Вылет</Text>
            <Text className={styles.airport}>{props.fromAirport}</Text>
          </Box>
          <Box className={styles.route_track}>
            <span />
            <FaPlaneDeparture />
            <span />
          </Box>
          <Box className={styles.airport_block}>
            <Text className={styles.label}>Прилет</Text>
            <Text className={styles.airport}>{props.toAirport}</Text>
          </Box>
        </Box>

        <Box className={styles.card_footer}>
          <Box className={styles.date_box}>
            <FaCalendarAlt />
            <Text>{formatDate(props.date)}</Text>
          </Box>
          <Box className={styles.seats_box}>
            <FaTicketAlt />
            <Text>{isSoldOut ? "Все места выкуплены" : `Осталось мест: ${availableSeats}`}</Text>
          </Box>
          <Box className={`${styles.select_label} ${isSoldOut ? styles.select_disabled : ""}`}>
            {isSoldOut ? "Недоступен" : "Выбрать рейс"}
          </Box>
        </Box>
      </Box>
    </Link>
  );
};

export default RecipeCard;
