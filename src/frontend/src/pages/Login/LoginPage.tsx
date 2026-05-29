import React from "react";

import { Box, Link, Text } from "@chakra-ui/react";
import { NavigateFunction } from "react-router-dom";
import { FaLock, FaPlaneDeparture } from "react-icons/fa";

import Input from "components/Input";
import RoundButton from "components/RoundButton";

import { AuthRequest } from "types/Account"
import { Login as LoginQuery } from "postAPI/accounts/Login";

import styles from "./LoginPage.module.scss";

type LoginProps = {
    navigate: NavigateFunction
}


class LoginPage extends React.Component<LoginProps> {
    acc: AuthRequest = {
        login: "",
        password: "",
    }

    setLogin(val: string) {
        this.acc.login = val
    }
    setPassword(val: string) {
        this.acc.password = val
    }

    submit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        let button = e.currentTarget
        button.disabled = true
        LoginQuery(this.acc).then(data => {
            button.disabled = false
            if (data.status === 200) {
                window.location.href = '/';
            } else {
                var title = document.getElementById("undertitle")
                if (title)
                    title.innerText = "Ошибка авторизации!"
            }
        });
    }

    render() {
        return <Box className={styles.auth_page}>
            <Box className={styles.visual_panel}>
                <Box className={styles.plane_badge}>
                    <FaPlaneDeparture />
                </Box>
                <Text className={styles.panel_kicker}>RSOI Airlines</Text>
                <Text className={styles.panel_title}>Войдите, чтобы управлять билетами</Text>
                <Text className={styles.panel_text}>После авторизации доступны бронирования, бонусы и история поездок.</Text>
            </Box>

            <Box className={styles.form_card}>
                <Box className={styles.form_title}>
                    <FaLock />
                    <Text>Вход в аккаунт</Text>
                </Box>

                <Box className={styles.input_div}>
                    <Input name="login" placeholder="Введите логин"
                    onInput={event => this.setLogin(event.currentTarget.value)}/>
                    <Input name="password" type="password" placeholder="Введите пароль"
                    onInput={event => this.setPassword(event.currentTarget.value)}/>
                </Box>

                <Text id="undertitle" className={styles.form_message}></Text>

                <Box className={styles.button_div}>
                    <RoundButton type="button" onClick={ (event) => this.submit(event) }> Войти </RoundButton>
                    <Link className={styles.signup_link} href="/auth/signup">
                        Создать аккаунт
                    </Link>
                </Box>
            </Box>
        </Box>
    }
}

export default LoginPage;
