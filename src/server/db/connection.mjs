import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const databasePath = path.join(process.cwd(), "src", "server", "db", "db.sqlite");

let databasePromise;

async function createConnection() {
  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = createConnection();
  }

  return databasePromise;
}

export async function closeDatabase() {
  if (!databasePromise) {
    return;
  }

  const db = await databasePromise;
  await db.close();
  databasePromise = undefined;
}

