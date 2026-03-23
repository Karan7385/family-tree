import dotenv from 'dotenv';
import express from 'express';
import connectDB from "./config/db.js";
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import cookieParser from 'cookie-parser';

dotenv.config();
connectDB();

import authRoutes from './routes/authRoute.js';
import memberRoutes from './routes/memberRoutes.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  "family-tree-seven-flax.vercel.app", // Your production URL
  "http://localhost:5173"                 // Your local dev URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy blocked this origin."), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(cookieParser());

const PORT = process.env.PORT;

app.use('/api/auth', authRoutes);
app.use('/api/tree', memberRoutes);


app.listen(PORT, (req, res) => {
    console.log(`Server is listening on http://localhost:${PORT}`)
})
