import express from "express";
import apiRouter from "../server/routes/api";

const app = express();
app.use(express.json());
// When deployed on Vercel, requests to /api/* will hit this function.
// Since Express is routed from the root of this function, it handles /api perfectly.
app.use("/api", apiRouter);

export default app;
