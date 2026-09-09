// Browser preview uses its own durable store; native devices use SQLite.
const prefix = (scope: string) =>
  `onmangeou.offline.v1:${encodeURIComponent(scope)}:`;
export async function readValue(
  scope: string,
  key: string,
): Promise<string | null> {
  return globalThis.localStorage.getItem(prefix(scope) + key);
}
export async function writeValue(
  scope: string,
  key: string,
  value: string,
): Promise<void> {
  globalThis.localStorage.setItem(prefix(scope) + key, value);
}
export async function removeValue(scope: string, key: string): Promise<void> {
  globalThis.localStorage.removeItem(prefix(scope) + key);
}
export async function listValues(
  scope: string,
  key: string,
): Promise<string[]> {
  return Object.keys(globalThis.localStorage)
    .filter((k) => k.startsWith(prefix(scope) + key))
    .map((k) => globalThis.localStorage.getItem(k))
    .filter((v): v is string => v !== null);
}
export async function clearScope(scope: string): Promise<void> {
  Object.keys(globalThis.localStorage)
    .filter((k) => k.startsWith(prefix(scope)))
    .forEach((k) => globalThis.localStorage.removeItem(k));
}
