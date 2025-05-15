import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import { HTTP_OK } from "./constants/httpStatusCodes";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/api", (_req: Request, res: Response) => {
  res.status(HTTP_OK).json({
    message: "BP Ticket Backend API is running!",
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on: http://localhost:${port}`);
});

export default app;
