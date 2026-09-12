export const MAX_RUNTIME_MESSAGE_LENGTH = 1000;

export function validateRuntimeMessage(message) {
  if (!isPlainObject(message) || message.type !== "LOOKUP") return null;
  if (Object.keys(message).length !== 2 || typeof message.number !== "string" || message.number.length > 12) return null;
  try {
    if (JSON.stringify(message).length > MAX_RUNTIME_MESSAGE_LENGTH) return null;
  } catch {
    return null;
  }
  return message.type;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
