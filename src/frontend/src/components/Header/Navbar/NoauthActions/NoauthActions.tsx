import React from "react";
import { Box, Text, Link } from "@chakra-ui/react";

import styles from "../Navbar.module.scss";

import AddIcon from "components/Icons/Add";
import LoginIcon from 'components/Icons/Login'

export interface NoauthActionsProps {}
const NoauthActions: React.FC<NoauthActionsProps> = () => {
    return (
        <Box className={styles.auth_actions}>
            <Link className={styles.auth_link} href="/auth/signin">
                <Box><LoginIcon width="18px" height="22px" fill="currentColor" /></Box>
                <Text>Войти</Text>
            </Link>
            <Link className={`${styles.auth_link} ${styles.auth_primary}`} href="/auth/signup">
                <Box><AddIcon width="20px" height="18px" fill="currentColor" /></Box>
                <Text>Регистрация</Text>
            </Link>
        </Box>
    )
}

export default React.memo(NoauthActions);
