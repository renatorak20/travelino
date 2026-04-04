import dotenv from "dotenv";

dotenv.config();
export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5002/api";