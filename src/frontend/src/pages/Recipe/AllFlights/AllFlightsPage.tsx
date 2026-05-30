import { Box } from "@chakra-ui/react";
import { SearchContext } from "context/Search";
import React, { useContext, useMemo, useState } from "react";
import RecipeMap, { FlightFilters } from "../../../components/RecipeMap/RecipeMap";

import styles from "./AllFlightsPage.module.scss";
import GetFlights from "postAPI/flights/GetAll";

interface AllRecipesProps {}

const AllFlightsPage: React.FC<AllRecipesProps> = (props) => {
  const searchContext = useContext(SearchContext);
  const [filters, setFilters] = useState<FlightFilters>({
    fromAirport: "",
    toAirport: "",
    minPrice: "",
    maxPrice: "",
    dateFrom: "",
    dateTo: "",
  });

  const hasFilters = useMemo(() => Object.values(filters).some((value) => value?.trim()), [filters]);
  const updateFilter = (name: keyof FlightFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const resetFilters = () => {
    setFilters({
      fromAirport: "",
      toAirport: "",
      minPrice: "",
      maxPrice: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <Box className={styles.main_box}>
      <Box className={styles.filter_panel}>
        <Box className={styles.filter_header}>
          <Box>
            <h2 className={styles.filter_title}>Фильтр рейсов</h2>
            <p className={styles.filter_hint}>Подберите перелет по направлению, дате и цене.</p>
          </Box>
          <button className={styles.reset_button} type="button" disabled={!hasFilters} onClick={resetFilters}>
            Сбросить
          </button>
        </Box>

        <Box className={styles.filters_grid}>
          <label className={styles.filter_field}>
            <span>Откуда</span>
            <input
              type="text"
              value={filters.fromAirport}
              placeholder="SVO, Москва"
              onChange={(event) => updateFilter("fromAirport", event.target.value)}
            />
          </label>
          <label className={styles.filter_field}>
            <span>Куда</span>
            <input
              type="text"
              value={filters.toAirport}
              placeholder="LED, Санкт-Петербург"
              onChange={(event) => updateFilter("toAirport", event.target.value)}
            />
          </label>
          <label className={styles.filter_field}>
            <span>Цена от</span>
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              placeholder="0"
              onChange={(event) => updateFilter("minPrice", event.target.value)}
            />
          </label>
          <label className={styles.filter_field}>
            <span>Цена до</span>
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              placeholder="50000"
              onChange={(event) => updateFilter("maxPrice", event.target.value)}
            />
          </label>
          <label className={styles.filter_field}>
            <span>Дата с</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label className={styles.filter_field}>
            <span>Дата по</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
        </Box>
      </Box>

      <RecipeMap searchQuery={searchContext.query} filters={filters} getCall={GetFlights}/>
    </Box>
  );
};

export default AllFlightsPage;
