import { Box, Text } from "@chakra-ui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaChartLine, FaClock, FaLock, FaPlaneDeparture, FaPlus, FaRoute, FaTicketAlt } from "react-icons/fa";

import CreateFlight from "postAPI/flights/Create";
import ListRequests from "postAPI/statistics";
import { FlightCreatePayload } from "types/Flight";
import { RequestStat } from "types/Statistics";

import styles from "./AdminPage.module.scss";

const ADMIN_LOGIN = "admin";
const ADMIN_PASSWORD = "admin";

type Credentials = {
    login: string;
    password: string;
};

const formatDateTimeInput = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const makeInitialFlight = (): FlightCreatePayload => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 30, 0, 0);

    return {
        flightNumber: "",
        fromAirport: "Москва Шереметьево",
        toAirport: "",
        date: formatDateTimeInput(nextWeek),
        price: 5000,
        availableSeats: 20,
    };
};

const formatMoney = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

const formatSeats = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} мест`;

const formatDuration = (value: number) => `${(value / 1000000000).toFixed(3)} c`;

const formatRequestDate = (value: Date) => value.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

const getTopPath = (requests: RequestStat[]) => {
    const counts = requests.reduce<Record<string, number>>((acc, item) => {
        acc[item.path] = (acc[item.path] || 0) + 1;
        return acc;
    }, {});

    const [path] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["-"];
    return path;
};

const AdminPage: React.FC = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const now = new Date(Date.now() + 60000);

    const [authorized, setAuthorized] = useState(localStorage.getItem("adminAuth") === "true");
    const [credentials, setCredentials] = useState<Credentials>({ login: "", password: "" });
    const [authError, setAuthError] = useState("");
    const [flight, setFlight] = useState<FlightCreatePayload>(makeInitialFlight());
    const [flightStatus, setFlightStatus] = useState("");
    const [isSavingFlight, setIsSavingFlight] = useState(false);
    const [startDate, setStartDate] = useState(formatDateTimeInput(yesterday));
    const [endDate, setEndDate] = useState(formatDateTimeInput(now));
    const [requests, setRequests] = useState<RequestStat[]>([]);
    const [statsStatus, setStatsStatus] = useState("");

    const failedRequests = useMemo(() => requests.filter(item => item.responseCode >= 400).length, [requests]);
    const averageDuration = useMemo(() => {
        if (requests.length === 0) {
            return 0;
        }

        return requests.reduce((sum, item) => sum + item.duration, 0) / requests.length;
    }, [requests]);
    const topPath = useMemo(() => getTopPath(requests), [requests]);
    const recentRequests = requests.slice(0, 12);

    const loadStats = useCallback(async () => {
        if (!authorized) {
            return;
        }

        setStatsStatus("Загружаю статистику...");
        try {
            const response = await ListRequests(new Date(startDate), new Date(endDate));
            setRequests(response.requests);
            setStatsStatus(`Загружено записей: ${response.requests.length}`);
        } catch (error) {
            setStatsStatus("Не удалось загрузить статистику");
            setRequests([]);
        }
    }, [authorized, endDate, startDate]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (credentials.login === ADMIN_LOGIN && credentials.password === ADMIN_PASSWORD) {
            localStorage.setItem("adminAuth", "true");
            setAuthorized(true);
            setAuthError("");
            return;
        }

        setAuthError("Неверный логин или пароль");
    };

    const handleLogout = () => {
        localStorage.removeItem("adminAuth");
        setAuthorized(false);
        setCredentials({ login: "", password: "" });
    };

    const updateCredentials = (name: keyof Credentials, value: string) => {
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const updateFlight = (name: keyof FlightCreatePayload, value: string) => {
        setFlight(prev => ({
            ...prev,
            [name]: name === "price" || name === "availableSeats" ? Number(value) : value,
        }));
    };

    const handleCreateFlight = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSavingFlight(true);
        setFlightStatus("");

        try {
            const response = await CreateFlight(flight);
            setFlightStatus(`Рейс ${response.content.flightNumber} добавлен в каталог`);
            setFlight(makeInitialFlight());
            window.setTimeout(loadStats, 600);
        } catch (error) {
            setFlightStatus("Не удалось добавить рейс");
        } finally {
            setIsSavingFlight(false);
        }
    };

    if (!authorized) {
        return (
            <Box className={styles.login_page}>
                <Box className={styles.login_card}>
                    <Box className={styles.plane_mark}>
                        <FaPlaneDeparture />
                    </Box>
                    <Text className={styles.login_title}>Администратор</Text>
                    <Text className={styles.login_text}>Вход для управления рейсами и просмотра статистики Kafka</Text>

                    <form className={styles.login_form} onSubmit={handleLogin}>
                        <label>
                            <span>Логин</span>
                            <input
                                value={credentials.login}
                                autoComplete="username"
                                onChange={event => updateCredentials("login", event.currentTarget.value)}
                            />
                        </label>

                        <label>
                            <span>Пароль</span>
                            <input
                                type="password"
                                value={credentials.password}
                                autoComplete="current-password"
                                onChange={event => updateCredentials("password", event.currentTarget.value)}
                            />
                        </label>

                        {authError && <Text className={styles.error_text}>{authError}</Text>}

                        <button className={styles.primary_button} type="submit">
                            <FaLock />
                            Войти
                        </button>
                    </form>
                </Box>
            </Box>
        );
    }

    return (
        <Box className={styles.admin_page}>
            <Box className={styles.top_bar}>
                <Box>
                    <Text className={styles.kicker}>Панель администратора</Text>
                    <Text className={styles.title}>Рейсы и статистика Kafka</Text>
                </Box>
                <button className={styles.secondary_button} type="button" onClick={handleLogout}>Выйти</button>
            </Box>

            <Box className={styles.summary_grid}>
                <Box className={styles.summary_item}>
                    <FaChartLine />
                    <span>Запросов</span>
                    <strong>{requests.length}</strong>
                </Box>
                <Box className={styles.summary_item}>
                    <FaTicketAlt />
                    <span>Ошибок</span>
                    <strong>{failedRequests}</strong>
                </Box>
                <Box className={styles.summary_item}>
                    <FaClock />
                    <span>Среднее время</span>
                    <strong>{formatDuration(averageDuration)}</strong>
                </Box>
                <Box className={styles.summary_item}>
                    <FaRoute />
                    <span>Популярный URL</span>
                    <strong title={topPath}>{topPath}</strong>
                </Box>
            </Box>

            <Box className={styles.content_grid}>
                <Box className={styles.panel}>
                    <Box className={styles.panel_header}>
                        <Box>
                            <Text className={styles.panel_title}>Добавить билет/рейс</Text>
                            <Text className={styles.panel_hint}>После сохранения рейс появится в общем списке</Text>
                        </Box>
                    </Box>

                    <form className={styles.flight_form} onSubmit={handleCreateFlight}>
                        <label>
                            <span>Номер рейса</span>
                            <input
                                required
                                value={flight.flightNumber}
                                placeholder="AFL777"
                                onChange={event => updateFlight("flightNumber", event.currentTarget.value.toUpperCase())}
                            />
                        </label>

                        <label>
                            <span>Откуда</span>
                            <input
                                required
                                value={flight.fromAirport}
                                placeholder="Москва Шереметьево"
                                onChange={event => updateFlight("fromAirport", event.currentTarget.value)}
                            />
                        </label>

                        <label>
                            <span>Куда</span>
                            <input
                                required
                                value={flight.toAirport}
                                placeholder="Казань"
                                onChange={event => updateFlight("toAirport", event.currentTarget.value)}
                            />
                        </label>

                        <label>
                            <span>Дата и время</span>
                            <input
                                required
                                type="datetime-local"
                                value={flight.date}
                                onChange={event => updateFlight("date", event.currentTarget.value)}
                            />
                        </label>

                        <label>
                            <span>Цена</span>
                            <input
                                required
                                type="number"
                                min="1"
                                value={flight.price}
                                onChange={event => updateFlight("price", event.currentTarget.value)}
                            />
                        </label>

                        <label>
                            <span>Количество мест</span>
                            <input
                                required
                                type="number"
                                min="1"
                                value={flight.availableSeats}
                                onChange={event => updateFlight("availableSeats", event.currentTarget.value)}
                            />
                        </label>

                        <Box className={styles.form_footer}>
                            <Text>
                                {flight.price > 0 ? formatMoney(flight.price) : "Укажите цену"}
                                {" · "}
                                {flight.availableSeats > 0 ? formatSeats(flight.availableSeats) : "укажите места"}
                            </Text>
                            <button className={styles.primary_button} type="submit" disabled={isSavingFlight}>
                                <FaPlus />
                                {isSavingFlight ? "Сохраняю..." : "Добавить"}
                            </button>
                        </Box>

                        {flightStatus && <Text className={styles.status_text}>{flightStatus}</Text>}
                    </form>
                </Box>

                <Box className={styles.panel}>
                    <Box className={styles.panel_header}>
                        <Box>
                            <Text className={styles.panel_title}>Статистика запросов</Text>
                            <Text className={styles.panel_hint}>Данные приходят через topic statistics и сохраняются statistics-service</Text>
                        </Box>
                    </Box>

                    <form className={styles.stats_form} onSubmit={(event) => { event.preventDefault(); loadStats(); }}>
                        <label>
                            <span>Начало</span>
                            <input
                                type="datetime-local"
                                value={startDate}
                                onChange={event => setStartDate(event.currentTarget.value)}
                            />
                        </label>
                        <label>
                            <span>Конец</span>
                            <input
                                type="datetime-local"
                                value={endDate}
                                onChange={event => setEndDate(event.currentTarget.value)}
                            />
                        </label>
                        <button className={styles.secondary_button} type="submit">Обновить</button>
                    </form>

                    <Text className={styles.status_text}>{statsStatus}</Text>

                    <Box className={styles.table_wrap}>
                        <table className={styles.stats_table}>
                            <thead>
                                <tr>
                                    <th>Метод</th>
                                    <th>URL</th>
                                    <th>Код</th>
                                    <th>Время</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={4}>За выбранный период запросов нет</td>
                                    </tr>
                                )}
                                {recentRequests.map((request, index) => (
                                    <tr key={`${request.path}-${request.startedAt.toISOString()}-${index}`}>
                                        <td>{request.method}</td>
                                        <td title={request.path}>{request.path}</td>
                                        <td>{request.responseCode}</td>
                                        <td>{formatRequestDate(request.startedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default AdminPage;
