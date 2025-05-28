import "dotenv/config";
import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { HTTP_OK } from "./constants/httpStatusCodes";
import productRoutes from "./routes/productRoutes";

import { setupSwagger } from "./documentations/swagger-docs";
dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
});

app.use(express.json());
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.get("/api", (_req: Request, res: Response) => {
  res.status(HTTP_OK).json({
    message: "BP Ticket Backend API is running!",
  });
});

const port = process.env.PORT || 5000;

app.use(errorHandler);


app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api-docs`);
});

setupSwagger(app);

export default app;
