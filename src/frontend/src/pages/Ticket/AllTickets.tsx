import { Badge, Box, HStack, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaCheckCircle, FaCoins, FaHistory, FaPlaneDeparture, FaTicketAlt, FaTimes, FaUserCircle } from "react-icons/fa";

import RoundButton from "components/RoundButton";
import { subtitleError } from "functions";
import CancelTicket from "postAPI/tickets/Cancel";
import ProfileInfo from "postAPI/tickets/Me";
import { BalanceHistory, Privilege } from "types/Privilege";
import { Ticket } from "types/Ticket";

import styles from "./AllTickets.module.scss";

type TokenClaims = {
    sub?: string;
    role?: string;
    exp?: number;
};

type TicketCardProps = {
    ticket: Ticket;
    cancelingUid?: string;
    onCancel: (ticketUid: string) => void;
};

type TicketFilter = "ALL" | "PAID" | "CANCELED";

const ticketFilters: Array<{ value: TicketFilter; label: string }> = [
    { value: "ALL", label: "Все" },
    { value: "PAID", label: "Активные" },
    { value: "CANCELED", label: "Отмененные" },
];

const emptyPrivilege: Privilege = {
    balance: 0,
    status: "BRONZE",
    history: [],
};

const moneyFormatter = new Intl.NumberFormat("ru-RU");

const decodeToken = (): TokenClaims => {
    const token = localStorage.getItem("authToken");
    if (!token) {
        return {};
    }

    try {
        const payload = token.split(".")[1];
        const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(normalizedPayload)
                .split("")
                .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return {};
    }
};

const formatMoney = (value: number) => `${moneyFormatter.format(value)} ₽`;

const formatBonus = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${moneyFormatter.format(value)} баллов`;
};

const formatDate = (value?: string, withYear = true) => {
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
        month: "short",
        year: withYear ? "numeric" : undefined,
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) {
        return "не указано";
    }

    return new Date(timestamp * 1000).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const shortUid = (ticketUid: string) => ticketUid ? ticketUid.slice(0, 8).toUpperCase() : "N/A";

const hashLogin = (login: string) => {
    let hash = 0;
    for (let i = 0; i < login.length; i += 1) {
        hash = ((hash << 5) - hash) + login.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString().padStart(6, "0").slice(0, 6);
};

const formatName = (login?: string) => {
    if (!login) {
        return "Пассажир";
    }

    const visiblePart = login.split("@")[0];
    return visiblePart
        .split(/[._-]/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ") || visiblePart;
};

const roleName = (role?: string) => {
    switch (role) {
        case "admin":
            return "Администратор";
        case "user":
            return "Пассажир";
        default:
            return "Пользователь";
    }
};

const statusName = (status?: string) => {
    switch (status) {
        case "GOLD":
            return "Gold";
        case "SILVER":
            return "Silver";
        case "BRONZE":
            return "Bronze";
        default:
            return status || "Bronze";
    }
};

const ticketStatusName = (status: string) => {
    switch (status) {
        case "PAID":
            return "Оплачен";
        case "CANCELED":
            return "Отменен";
        default:
            return status;
    }
};

const historyMeta = (operationType: string) => {
    switch (operationType) {
        case "FILL_IN_BALANCE":
            return {
                title: "Начисление бонусов",
                subtitle: "За покупку билета",
                className: styles.history_positive,
            };
        case "DEBIT_THE_ACCOUNT":
            return {
                title: "Списание бонусов",
                subtitle: "Оплата бонусами или отмена начисления",
                className: styles.history_negative,
            };
        case "FILLED_BY_MONEY":
            return {
                title: "Пополнение",
                subtitle: "Операция по счету",
                className: styles.history_positive,
            };
        default:
            return {
                title: "Операция по бонусам",
                subtitle: operationType,
                className: styles.history_neutral,
            };
    }
};

const TicketCard: React.FC<TicketCardProps> = ({ ticket, cancelingUid, onCancel }) => {
    const isCanceled = ticket.status === "CANCELED";
    const isCanceling = cancelingUid === ticket.ticketUid;

    return (
        <Box className={`${styles.ticket_card} ${isCanceled ? styles.ticket_canceled : ""}`}>
            <HStack className={styles.ticket_top}>
                <Box className={styles.ticket_number}>
                    <FaTicketAlt />
                    <Text>{ticket.flightNumber}</Text>
                </Box>
                <Badge className={`${styles.ticket_status} ${isCanceled ? styles.status_canceled : styles.status_paid}`}>
                    {ticketStatusName(ticket.status)}
                </Badge>
            </HStack>

            <Box className={styles.route_grid}>
                <Box className={styles.airport_block}>
                    <Text className={styles.label}>Откуда</Text>
                    <Text className={styles.airport}>{ticket.fromAirport}</Text>
                </Box>
                <Box className={styles.route_track}>
                    <span />
                    <FaPlaneDeparture />
                    <span />
                </Box>
                <Box className={styles.airport_block}>
                    <Text className={styles.label}>Куда</Text>
                    <Text className={styles.airport}>{ticket.toAirport}</Text>
                </Box>
            </Box>

            <SimpleGrid className={styles.ticket_meta} columns={{ base: 1, md: 3 }}>
                <Box>
                    <Text className={styles.label}>Вылет</Text>
                    <Text className={styles.meta_value}>{formatDate(ticket.date)}</Text>
                </Box>
                <Box>
                    <Text className={styles.label}>Стоимость</Text>
                    <Text className={styles.meta_value}>{formatMoney(ticket.price)}</Text>
                </Box>
                <Box>
                    <Text className={styles.label}>Билет</Text>
                    <Text className={styles.meta_value}>#{shortUid(ticket.ticketUid)}</Text>
                </Box>
            </SimpleGrid>

            {ticket.status === "PAID" && (
                <RoundButton
                    className={styles.cancel_button}
                    type="button"
                    disabled={isCanceling}
                    onClick={() => onCancel(ticket.ticketUid)}
                >
                    <FaTimes />
                    {isCanceling ? "Отменяем..." : "Отменить бронь"}
                </RoundButton>
            )}

            {isCanceled && (
                <Box className={styles.canceled_note}>
                    <FaCheckCircle />
                    <Text>Бронирование отменено</Text>
                </Box>
            )}
        </Box>
    );
};

const HistoryItem: React.FC<{ item: BalanceHistory }> = ({ item }) => {
    const meta = historyMeta(item.operationType);

    return (
        <Box className={styles.history_item}>
            <Box className={`${styles.history_icon} ${meta.className}`}>
                <FaCoins />
            </Box>
            <Box className={styles.history_body}>
                <Text className={styles.history_title}>{meta.title}</Text>
                <Text className={styles.history_subtitle}>{meta.subtitle}</Text>
                <Text className={styles.history_ticket}>Билет #{shortUid(item.ticketUid)}</Text>
            </Box>
            <Box className={styles.history_amount_box}>
                <Text className={`${styles.history_amount} ${meta.className}`}>{formatBonus(item.balanceDiff)}</Text>
                <Text className={styles.history_date}>{formatDate(item.date, false)}</Text>
            </Box>
        </Box>
    );
};

const AllTicketsPage = () => {
    const [tickets, setTickets] = useState<Array<Ticket>>([]);
    const [privilege, setPrivilege] = useState<Privilege>(emptyPrivilege);
    const [loading, setLoading] = useState(true);
    const [cancelingUid, setCancelingUid] = useState<string>();
    const [ticketFilter, setTicketFilter] = useState<TicketFilter>("ALL");
    const claims = useMemo(() => decodeToken(), []);

    const getProfileInfo = async () => {
        setLoading(true);
        try {
            const response = await ProfileInfo();
            if (response.status !== 200) {
                subtitleError("Ошибка получения информации о профиле");
                return;
            }

            const profile = response.data;
            setTickets(Array.isArray(profile.tickets) ? profile.tickets : []);
            setPrivilege(profile.privilege || emptyPrivilege);
        } catch {
            subtitleError("Ошибка получения информации о профиле");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getProfileInfo();
    }, []);

    const cancelTicket = async (ticketUid: string) => {
        setCancelingUid(ticketUid);
        try {
            const response = await CancelTicket(ticketUid);
            if (response.status !== 204) {
                subtitleError("Ошибка отмены бронирования");
                return;
            }
            await getProfileInfo();
        } catch {
            subtitleError("Ошибка отмены бронирования");
        } finally {
            setCancelingUid(undefined);
        }
    };

    const activeTickets = tickets.filter((ticket) => ticket.status === "PAID");
    const filteredTickets = tickets.filter((ticket) => ticketFilter === "ALL" || ticket.status === ticketFilter);
    const history = [...(privilege.history || [])].sort((left, right) => {
        const leftTime = new Date(left.date).getTime();
        const rightTime = new Date(right.date).getTime();
        return rightTime - leftTime;
    });
    const totalSpent = activeTickets.reduce((sum, ticket) => sum + ticket.price, 0);
    const earnedBonuses = history
        .filter((item) => item.balanceDiff > 0)
        .reduce((sum, item) => sum + item.balanceDiff, 0);
    const usedBonuses = Math.abs(history
        .filter((item) => item.balanceDiff < 0)
        .reduce((sum, item) => sum + item.balanceDiff, 0));
    const login = claims.sub || "";
    const displayName = formatName(login);
    const email = login.includes("@") ? login : "не указан";
    const expiresAt = formatTimestamp(claims.exp);

    if (loading) {
        return (
            <Box className={styles.loading_state}>
                <Spinner color="#155e75" size="lg" />
                <Text>Загружаем личный кабинет</Text>
            </Box>
        );
    }

    return (
        <VStack className={styles.profile_page}>
            <Box className={styles.hero_grid}>
                <Box className={styles.profile_card}>
                    <Box className={styles.avatar}>
                        <FaUserCircle />
                    </Box>
                    <Box className={styles.profile_info}>
                        <Text className={styles.overline}>Личный кабинет</Text>
                        <Text className={styles.profile_name}>{displayName}</Text>
                        <Text className={styles.profile_login}>{login || "Пользователь не авторизован"}</Text>

                        <SimpleGrid className={styles.personal_grid} columns={{ base: 1, md: 2 }}>
                            <Box>
                                <Text className={styles.label}>Почта</Text>
                                <Text className={styles.personal_value}>{email}</Text>
                            </Box>
                            <Box>
                                <Text className={styles.label}>Роль</Text>
                                <Text className={styles.personal_value}>{roleName(claims.role)}</Text>
                            </Box>
                            <Box>
                                <Text className={styles.label}>Клиентский ID</Text>
                                <Text className={styles.personal_value}>RSOI-{hashLogin(login || "guest")}</Text>
                            </Box>
                        </SimpleGrid>
                    </Box>
                </Box>

                <Box className={`${styles.privilege_card} ${styles[privilege.status?.toLowerCase() || "bronze"]}`}>
                    <HStack className={styles.privilege_title}>
                        <FaCoins />
                        <Text>Бонусный счет</Text>
                    </HStack>
                    <Text className={styles.balance}>{moneyFormatter.format(privilege.balance)}</Text>
                    <Text className={styles.balance_caption}>доступных баллов</Text>
                    <Box className={styles.status_badge}>{statusName(privilege.status)}</Box>
                </Box>
            </Box>

            <SimpleGrid className={styles.stats_grid} columns={{ base: 1, md: 4 }}>
                <Box className={styles.stat_card}>
                    <FaTicketAlt />
                    <Text className={styles.stat_value}>{activeTickets.length}</Text>
                    <Text className={styles.stat_label}>активных билетов</Text>
                </Box>
                <Box className={styles.stat_card}>
                    <FaCalendarAlt />
                    <Text className={styles.stat_value}>{formatMoney(totalSpent)}</Text>
                    <Text className={styles.stat_label}>в активных бронях</Text>
                </Box>
                <Box className={styles.stat_card}>
                    <FaCoins />
                    <Text className={styles.stat_value}>{moneyFormatter.format(earnedBonuses)}</Text>
                    <Text className={styles.stat_label}>начислено бонусов</Text>
                </Box>
                <Box className={styles.stat_card}>
                    <FaHistory />
                    <Text className={styles.stat_value}>{moneyFormatter.format(usedBonuses)}</Text>
                    <Text className={styles.stat_label}>списано бонусов</Text>
                </Box>
            </SimpleGrid>

            <Box className={styles.content_grid}>
                <Box className={styles.section}>
                    <HStack className={styles.section_header}>
                        <Box>
                            <Text className={styles.section_title}>Мои билеты</Text>
                            <Text className={styles.section_subtitle}>Все активные и отмененные бронирования</Text>
                        </Box>
                        <Badge className={styles.counter_badge}>{filteredTickets.length}</Badge>
                    </HStack>

                    {tickets.length === 0 && (
                        <Box className={styles.empty_state}>
                            <FaTicketAlt />
                            <Text className={styles.empty_title}>Билетов пока нет</Text>
                            <Text className={styles.empty_text}>Выберите рейс на главной странице и оформите бронирование.</Text>
                        </Box>
                    )}

                    {tickets.length > 0 && (
                        <Box className={styles.ticket_filters}>
                            {ticketFilters.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    className={`${styles.filter_button} ${ticketFilter === filter.value ? styles.filter_active : ""}`}
                                    aria-pressed={ticketFilter === filter.value}
                                    onClick={() => setTicketFilter(filter.value)}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </Box>
                    )}

                    {tickets.length > 0 && filteredTickets.length === 0 && (
                        <Box className={styles.empty_state}>
                            <FaTicketAlt />
                            <Text className={styles.empty_title}>Нет билетов в этом фильтре</Text>
                            <Text className={styles.empty_text}>Выберите другой статус бронирования.</Text>
                        </Box>
                    )}

                    <Box className={styles.tickets_list}>
                        {filteredTickets.map((ticket) => (
                            <TicketCard
                                key={ticket.ticketUid}
                                ticket={ticket}
                                cancelingUid={cancelingUid}
                                onCancel={cancelTicket}
                            />
                        ))}
                    </Box>
                </Box>

                <Box className={styles.section}>
                    <HStack className={styles.section_header}>
                        <Box>
                            <Text className={styles.section_title}>История покупок</Text>
                            <Text className={styles.section_subtitle}>Начисления и списания бонусов</Text>
                        </Box>
                        <Badge className={styles.counter_badge}>{history.length}</Badge>
                    </HStack>

                    {history.length === 0 && (
                        <Box className={styles.empty_state}>
                            <FaHistory />
                            <Text className={styles.empty_title}>История пустая</Text>
                            <Text className={styles.empty_text}>После покупки билетов здесь появятся операции по бонусам.</Text>
                        </Box>
                    )}

                    <Box className={styles.history_list}>
                        {history.map((item, index) => (
                            <HistoryItem key={`${item.ticketUid}-${item.operationType}-${index}`} item={item} />
                        ))}
                    </Box>
                </Box>
            </Box>
        </VStack>
    );
};

export default AllTicketsPage;
