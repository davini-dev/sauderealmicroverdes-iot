import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada. Defina no .env (ver .env.example)."
    );
  }
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

// Reaproveita o pool entre hot-reloads em dev e entre requisições em produção.
const pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export default pool;
