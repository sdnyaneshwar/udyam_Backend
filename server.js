import express from "express";
import cors from "cors";
import udyamRoutes from "./routes/udyamRoutes.js"; // Adjust path as needed
import dotenv from 'dotenv';
dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.URL || "*", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Routes
app.use("/udyam", udyamRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
