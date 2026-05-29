import React from "react";
import { Routes, Route } from "react-router";
import { BrowserRouter } from "react-router-dom";
import Header from ".";
import FlightHeader from "./Recipe";


export const HeaderRouter: React.FC<{}> = () => {
    return <BrowserRouter>
        <Routes>
            <Route path="/" element={<Header title="Все рейсы" undertitle="Быстрый поиск перелетов, покупка билетов и управление бронированиями" />} />
            <Route path="/auth/signin" element={<Header title="Вход" undertitle="Войдите, чтобы покупать билеты и смотреть личный кабинет" />} />
            <Route path="/auth/signup" element={<Header title="Регистрация" undertitle="Создайте аккаунт для бронирования рейсов" />} />
            <Route path="/flights/:fligtNumber" element={<FlightHeader title="" />} />
            <Route path="/tickets" element={<Header title="Личный кабинет" />} />
            <Route path="/statistics" element={<Header title="Статистика сервиса" />} />
            <Route path="/admin" element={<Header title="Администратор" undertitle="Управление рейсами и статистикой сервиса" />} />

            {/* <Route path="/users" element={<SearchHeader title="Все пользователи" />} />
            <Route path="/me/likes" element={<Header subtitle="Понравилось" title="Мне" />} />
            <Route path="/me/recipes" element={<Header subtitle="Автор" title="Я" />} />
            <Route path="/accounts/:login/recipes" element={<UserHeader subtitle="Автор" title="" />} />
            <Route path="/accounts/:login/likes" element={<UserHeader subtitle="Понравилось" title="" />} />
            <Route path="/categories/:title" element={<CategoryHeader subtitle="Категория" title="" />} /> */}

            <Route path="*" element={<Header title="Страница не найдена" />} />
        </Routes>
    </BrowserRouter>
}
