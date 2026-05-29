import React from "react";
import { Box, Text, Link } from "@chakra-ui/react";
import { FaTicketAlt, FaTools } from "react-icons/fa";

import styles from "../Navbar.module.scss";

import AuthorIcon from "components/Icons/Author";
import DownArrowIcon from "components/Icons/DownArrow";
import LogoutIcon from "components/Icons/Logout";

export interface AuthActionsProps {
    login: string
    logout: () => void
}
const AuthActions: React.FC<AuthActionsProps> = (props) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <Box className={styles['user-act']}>
            { expanded && <Link href="/tickets"> <FaTicketAlt/> <Text>Билеты</Text> </Link> }
            { expanded && <Link href="/admin"> <FaTools/> <Text>Админка</Text> </Link> }
            { expanded && <Link onClick={props.logout}> <LogoutIcon/> <Text>Выйти</Text> </Link> }

            { (!expanded) && <Box> <AuthorIcon/> </Box> }
            { (!expanded) && <Text> {props.login} </Text> }

            <Box onClick={() => setExpanded(!expanded)}> 
                <DownArrowIcon flipped={expanded}/> 
            </Box>
        </Box>
    )
}

export default React.memo(AuthActions);
