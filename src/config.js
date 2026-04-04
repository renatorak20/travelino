import dotenv from "dotenv";

dotenv.config();
export const API_BASE_URL = process.env.JWT_SECRET || "http://localhost:5002/api";