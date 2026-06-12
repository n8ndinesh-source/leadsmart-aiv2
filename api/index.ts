import express, { Request, Response, NextFunction } from "express";
import apiRouter from "../server/routes/api";

const app = express();
app.use(express.json());

// When deployed on Vercel, requests to /api/* will hit this function.
// Since Express is routed from the root of this function, it handles /api perfectly.
app.use("/api", apiRouter);

// Global Error Handler for Vercel
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Vercel Express Unhandled Error:", err);
  res.status(500).json({ error: "Internal Server Error: " + (err.message || "Unknown error") });
});

export default app;
