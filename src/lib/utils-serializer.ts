import { Decimal } from '@prisma/client/runtime/library';

// Helper to serialize Prisma Decimal values to number
export function serializeDecimal(value: Decimal | number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  // Decimal object has toNumber() method
  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }
  return null;
}

// Helper to serialize an object with Decimal and Date fields
export function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item)) as T;
  }
  
  if (typeof data === 'object') {
    // Handle Date objects
    if (data instanceof Date) {
      return data.toISOString() as T;
    }
    
    // Handle Decimal objects
    if (data instanceof Decimal) {
      return data.toNumber() as T;
    }
    
    // Handle objects with toNumber method (Prisma Decimal-like)
    const objWithData = data as Record<string, unknown>;
    if (typeof objWithData.toNumber === 'function') {
      return (objWithData.toNumber as () => number)() as T;
    }
    
    // Handle regular objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(objWithData)) {
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (value instanceof Decimal) {
        result[key] = value.toNumber();
      } else if (typeof value === 'object' && value !== null) {
        // Check if it's a Decimal-like object
        const nestedObj = value as Record<string, unknown>;
        if (typeof nestedObj.toNumber === 'function') {
          result[key] = (nestedObj.toNumber as () => number)();
        } else {
          result[key] = serializeData(value);
        }
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  
  return data;
}
