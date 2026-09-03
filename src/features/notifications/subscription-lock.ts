// The settings card and the headless listener share one mutation queue.
// An opt-out invalidates any token lookup already in flight.
let queue: Promise<unknown> = Promise.resolve();
let preferenceVersion = 0;
export const currentPushPreference = () => preferenceVersion;
export const changePushPreference = () => ++preferenceVersion;
export function serializePushSubscription<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}
