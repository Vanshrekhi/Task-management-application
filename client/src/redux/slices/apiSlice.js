import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const API_URL = "/api"; // Vite proxy use karega → localhost:8800/api

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include", // cookies bhejna zaroori hai JWT ke liye
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: [],
  endpoints: (builder) => ({}),
});