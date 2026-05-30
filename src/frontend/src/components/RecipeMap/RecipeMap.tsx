import { Box, Text } from "@chakra-ui/react";
import React from "react";
import RecipeCard from "../RecipeCard";
import { AllFilghtsResp } from "postAPI"

import styles from "./RecipeMap.module.scss";

export type FlightFilters = {
    fromAirport?: string;
    toAirport?: string;
    minPrice?: string;
    maxPrice?: string;
    dateFrom?: string;
    dateTo?: string;
};

interface RecipeBoxProps {
    searchQuery?: string
    filters?: FlightFilters
    getCall?: (page: number, size: number) => Promise<AllFilghtsResp>
}

type State = AllFilghtsResp

class RecipeMap extends React.Component<RecipeBoxProps, State> {
    state: State = {
        page: 0,
        pageSize: 0,
        totalElements: 0,
        items: [],
    };

    async getAll() {
        if (!this.props.getCall) {
            return
        }

        const data = await this.props.getCall(1, 20)
        if (data) {
            this.setState({
                ...data,
                items: Array.isArray(data.items) ? data.items : [],
            })
        }
    }

    componentDidMount() {
        this.getAll()
    }

    componentDidUpdate(prevProps: RecipeBoxProps) {
        if (this.props.getCall !== prevProps.getCall) {
            this.getAll()
        }
    }

    normalize(value?: string) {
        return (value || "").trim().toLowerCase();
    }

    matchesSearch(item) {
        const query = this.normalize(this.props.searchQuery);
        if (!query) {
            return true;
        }

        return [
            item.flightNumber,
            item.fromAirport,
            item.toAirport,
        ].some((value) => this.normalize(value).includes(query));
    }

    matchesFilters(item) {
        const filters = this.props.filters || {};
        const fromAirport = this.normalize(filters.fromAirport);
        const toAirport = this.normalize(filters.toAirport);
        const minPrice = Number(filters.minPrice);
        const maxPrice = Number(filters.maxPrice);
        const flightTime = new Date(item.date).getTime();
        const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : undefined;
        const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : undefined;

        if (fromAirport && !this.normalize(item.fromAirport).includes(fromAirport)) {
            return false;
        }
        if (toAirport && !this.normalize(item.toAirport).includes(toAirport)) {
            return false;
        }
        if (!Number.isNaN(minPrice) && filters.minPrice && item.price < minPrice) {
            return false;
        }
        if (!Number.isNaN(maxPrice) && filters.maxPrice && item.price > maxPrice) {
            return false;
        }
        if (dateFrom && !Number.isNaN(dateFrom) && flightTime < dateFrom) {
            return false;
        }
        if (dateTo && !Number.isNaN(dateTo) && flightTime > dateTo) {
            return false;
        }

        return true;
    }

    render() {
        const items = this.state.items.filter((item) => this.matchesSearch(item) && this.matchesFilters(item));

        if (items.length === 0) {
            return (
                <Box className={styles.empty_state}>
                    <Text className={styles.empty_title}>Рейсы не найдены</Text>
                    <Text className={styles.empty_text}>Измените параметры фильтра или поисковую строку.</Text>
                </Box>
            )
        }

        return (
            <Box className={styles.map_box}>
                {items.map(item => <RecipeCard {...item} key={item.flightNumber}/>)}
            </Box>
        )
    }
}

export default React.memo(RecipeMap);
