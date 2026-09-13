export const MAX_RUNTIME_MESSAGE_LENGTH = 1000;
export const MIN_BATCH_LOOKUP_COUNT = 1;
export const MAX_BATCH_LOOKUP_COUNT = 10;

export function validateRuntimeMessage(message) {
  if (!isPlainObject(message) || Object.keys(message).length !== 2) return null;
  if (message.type === "LOOKUP" && (typeof message.number !== "string" || message.number.length > 12)) return null;
  if (message.type === "BATCH_LOOKUP" && !isValidBatch(message.numbers)) return null;
  if (message.type !== "LOOKUP" && message.type !== "BATCH_LOOKUP") return null;
  try {
    if (JSON.stringify(message).length > MAX_RUNTIME_MESSAGE_LENGTH) return null;
  } catch {
    return null;
  }
  return message.type;
}

function isValidBatch(numbers) {
  return Array.isArray(numbers) &&
    numbers.length >= MIN_BATCH_LOOKUP_COUNT &&
    numbers.length <= MAX_BATCH_LOOKUP_COUNT &&
    numbers.every((number) => typeof number === "string" && /^[0-9]{6}$/u.test(number)) &&
    new Set(numbers).size === numbers.length;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
