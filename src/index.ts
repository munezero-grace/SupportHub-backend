import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/auth", authRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    message: "BP Ticket Backend API is running!",
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on: http://localhost:${port}`);
});

export default app;
