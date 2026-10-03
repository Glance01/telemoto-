/**
 * Helper utilities for Firestore data sanitation
 * Strips 'undefined' values from nested objects so setDoc / updateDoc never fail
 */

export function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        result[key] = removeUndefinedFields(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}
