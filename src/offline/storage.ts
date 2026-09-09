import { openDatabaseAsync } from "expo-sqlite";

const database = openDatabaseAsync("onmangeou-offline-v1.db").then(
  async (db) => {
    await db.execAsync(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS offline_values (scope TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(scope,key));`);
    return db;
  },
);
export async function readValue(
  scope: string,
  key: string,
): Promise<string | null> {
  const row = await (
    await database
  ).getFirstAsync<{ value: string }>(
    "SELECT value FROM offline_values WHERE scope=? AND key=?",
    scope,
    key,
  );
  return row?.value ?? null;
}
export async function writeValue(
  scope: string,
  key: string,
  value: string,
): Promise<void> {
  await (
    await database
  ).runAsync(
    "INSERT INTO offline_values(scope,key,value) VALUES (?,?,?) ON CONFLICT(scope,key) DO UPDATE SET value=excluded.value",
    scope,
    key,
    value,
  );
}
export async function removeValue(scope: string, key: string): Promise<void> {
  await (
    await database
  ).runAsync("DELETE FROM offline_values WHERE scope=? AND key=?", scope, key);
}
export async function listValues(
  scope: string,
  prefix: string,
): Promise<string[]> {
  const rows = await (
    await database
  ).getAllAsync<{ value: string }>(
    "SELECT value FROM offline_values WHERE scope=? AND key LIKE ? ORDER BY rowid",
    scope,
    `${prefix}%`,
  );
  return rows.map((row) => row.value);
}
export async function clearScope(scope: string): Promise<void> {
  await (
    await database
  ).runAsync("DELETE FROM offline_values WHERE scope=?", scope);
}
