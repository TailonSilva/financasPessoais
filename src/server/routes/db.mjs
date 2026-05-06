import { Router } from "express";
import { getDatabase } from "../../lib/db/server.mjs";

const router = Router();

router.get("/", async (request, response) => {
  try {
    const db = await getDatabase();
    const resultado = await db.get("SELECT sqlite_version() AS versao");

    response.json({
      conectado: true,
      sqlite: resultado?.versao,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao conectar.";

    response.status(500).json({
      conectado: false,
      erro: message,
    });
  }
});

export default router;

