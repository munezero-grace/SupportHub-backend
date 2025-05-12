import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

// Basic route
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    message: "BP Ticket Backend API is running!",
  });
});

// Server
app.listen(port, () => {
  console.log(`Server running on: http://localhost:${port}`);
  console.log("Ready for requests");
});

export default app;
