import { Box, Text } from "@chakra-ui/react";
import React from "react";
import RecipeCard from "../RecipeCard";
import { AllFilghtsResp } from "postAPI"

import styles from "./RecipeMap.module.scss";

interface RecipeBoxProps {
    searchQuery?: string
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
        if (this.props.searchQuery !== prevProps.searchQuery) {
            this.getAll()
        }
    }

    render() {
        if (this.state.items.length === 0) {
            return (
                <Box className={styles.empty_state}>
                    <Text className={styles.empty_title}>Рейсы не найдены</Text>
                    <Text className={styles.empty_text}>Пока в базе нет доступных перелетов.</Text>
                </Box>
            )
        }

        return (
            <Box className={styles.map_box}>
                {this.state.items.map(item => <RecipeCard {...item} key={item.flightNumber}/>)}
            </Box>
        )
    }
}

export default React.memo(RecipeMap);
