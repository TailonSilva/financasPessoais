import cors from "cors";
import express from "express";
import { closeDatabase } from "./connection.mjs";
import dbRoutes from "../routes/db.mjs";

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:3000",
  }),
);
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    service: "financas-pessoais-api",
  });
});

app.use("/api/db", dbRoutes);

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`API Express rodando em http://127.0.0.1:${port}`);
});

async function shutdown() {
  await closeDatabase();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
