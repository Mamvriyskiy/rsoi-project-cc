import React from "react";
import {
  Text,
  Box,
} from "@chakra-ui/react";

import styles from "./Titles.module.scss";


export interface TitlesProps {
  title: string
  undertitle?: string
}

const Titles: React.FC<TitlesProps> = (props) => {
  return (

    <Box className={styles.titles}>
        <Text id="title" className={styles.title}>
            {props.title}
        </Text>
        {props.undertitle && (
            <Text id="undertitle" className={styles.undertitle}>
                {props.undertitle}
            </Text>
        )}
    </Box>
  );
};

export default React.memo(Titles);
