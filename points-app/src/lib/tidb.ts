import mysql from "mysql2/promise";

export function getPool() {
  const ssl =
    process.env.TIDB_SSL === "true"
      ? { rejectUnauthorized: true }
      : undefined;

  return mysql.createPool({
    host: process.env.TIDB_HOST,
    port: Number(process.env.TIDB_PORT || "4000"),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    ssl,
    waitForConnections: true,
    connectionLimit: 5,
  });
}
