import express, { Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import clientRoutes from "./routes/clientRoutes";
import { HTTP_OK } from "./constants/httpStatusCodes";
import productRoutes from "./routes/productRoutes";
import { setupSwagger } from "./documentations/swagger-docs";
import ticketsRoutes from "./routes/ticketsRoutes";
import userRoutes from "./routes/userRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import dotenv from "dotenv";
import path from "path";
import { startPriorityRefreshJob } from "./jobs/priorityRefresh";

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log(
  "GROQ API key:",
  process.env.GROQ_API_KEY ? "loaded ✓" : "MISSING",
);

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
if (process.env.NODE_ENV === "production" && corsOrigin === "*") {
  console.warn(
    "[cors] WARNING: CORS_ORIGIN is not set in production — allowing all origins. Set CORS_ORIGIN to your frontend URL.",
  );
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(express.json());
app.use(limiter);
if (process.env.NODE_ENV === "test") {
  const mockAuth = require("./middlewares/mockAuth").default;
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth") || req.path === "/api") return next();
    return mockAuth(req, res, next);
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/api", (_req: Request, res: Response) => {
  res.status(HTTP_OK).json({
    message: "Support Hub Backend API is running!",
  });
});

const port = process.env.PORT || 5000;

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api-docs`);
  startPriorityRefreshJob();
});

setupSwagger(app);
export default app;
