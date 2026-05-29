export const navItems = {
    '': [
        { name: "Рейсы", ref: "/" },
        { name: "Админка", ref: "/admin" },
    ],
    'admin': [
        { name: "Новый пользователь", ref: "/auth/signup" },
        { name: "Рейсы", ref: "/" },
        { name: "Админка", ref: "/admin" },
        { name: "Личный кабинет", ref: "/tickets" },
        { name: "Статистика", ref: "/statistics" },
    ],
    'user': [
        { name: "Рейсы", ref: "/" },
        { name: "Админка", ref: "/admin" },
        { name: "Личный кабинет", ref: "/tickets" },
    ],
}
