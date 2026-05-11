// Importa o Express para criar a aplicação HTTP.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Importa as rotas de bancos.
import { bancosRoutes } from "./rotas/bancos.js";
// Importa as rotas de cartões de crédito.
import { cartoesCreditoRoutes } from "./rotas/cartoesCredito.js";
// Importa as rotas de categorias.
import { categoriasRoutes } from "./rotas/categorias.js";
// Importa as rotas de contas.
import { routes } from "./rotas/contas.js";
// Importa as rotas de lancamentos
import { lancamentosRoutes } from "./rotas/lancamentos.js";
// Importa as rotas de tipos de conta.
import { tiposContaRoutes } from "./rotas/tiposConta.js";

// Cria e exporta a aplicação Express.
export const app = express();
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const uploadsPath = process.env.UPLOADS_PATH || path.join(dirname, "uploads");

// Habilita o Express para receber JSON no corpo das requisições.
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsPath));
// Registra as rotas de bancos na aplicação.
app.use(bancosRoutes);
// Registra as rotas de cartões de crédito na aplicação.
app.use(cartoesCreditoRoutes);
// Registra as rotas de categorias na aplicação.
app.use(categoriasRoutes);
// Registra as rotas de contas na aplicação.
app.use(routes);
// Registra as rotas de lancamentos na aplicação.
app.use(lancamentosRoutes);
// Registra as rotas de tipos de conta na aplicação.
app.use(tiposContaRoutes);
