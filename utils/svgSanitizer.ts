/**
 * SVG Path Sanitization Utility
 * 
 * Prevents production crashes from malformed SVG path attributes (NaN, undefined, null).
 * Use this utility to ensure all SVG path 'd' attributes have safe fallbacks.
 * 
 * Usage:
 *   import { sanitizePath, safeSVGNumber } from './utils/svgSanitizer';
 *   <path d={sanitizePath(pathData)} />
 *   <circle cx={safeSVGNumber(centerX)} cy={safeSVGNumber(centerY)} r={safeSVGNumber(radius)} />
 */

/**
 * Sanitizes SVG path data to ensure it's always a valid string.
 * Prevents NaN, undefined, null, or empty string values from reaching the DOM.
 * 
 * @param pathData - The path data string (can be string, undefined, null, number, or NaN)
 * @param fallback - Optional fallback path (defaults to "M0 0" which is a valid SVG move command)
 * @returns A safe SVG path string
 * 
 * @example
 *   sanitizePath(undefined) // returns "M0 0"
 *   sanitizePath("M10 10 L20 20") // returns "M10 10 L20 20"
 *   sanitizePath(generatePath(count)) // returns valid path or "M0 0" if generatePath returns invalid
 */
export function sanitizePath(
  pathData: string | undefined | null | number,
  fallback: string = "M0 0"
): string {
  // Handle null or undefined
  if (pathData == null) {
    return fallback;
  }

  // Handle number (convert to string)
  if (typeof pathData === 'number') {
    if (isNaN(pathData) || !isFinite(pathData)) {
      return fallback;
    }
    return String(pathData);
  }

  // Handle string
  if (typeof pathData === 'string') {
    const trimmed = pathData.trim();
    
    // Reject empty strings, "NaN", "undefined", or other invalid values
    if (trimmed === '' || 
        trimmed === 'NaN' || 
        trimmed === 'undefined' || 
        trimmed === 'null' ||
        /^\s*$/.test(trimmed)) {
      return fallback;
    }

    // Validate that the path contains at least one valid SVG command
    // Basic validation: should start with M, m, L, l, C, c, Q, q, Z, z, etc.
    if (!/^[MLHVCSQTAZmlhvcsqtaz\s]/.test(trimmed)) {
      return fallback;
    }

    return trimmed;
  }

  // Fallback for any other type
  return fallback;
}

/**
 * Sanitizes numeric SVG attributes (cx, cy, r, x, y, width, height, etc.)
 * Ensures the value is always a valid number.
 * 
 * @param value - The numeric value (can be number, string, undefined, null, or NaN)
 * @param fallback - Optional fallback number (defaults to 0)
 * @returns A safe numeric value
 * 
 * @example
 *   safeSVGNumber(undefined) // returns 0
 *   safeSVGNumber(NaN) // returns 0
 *   safeSVGNumber(50) // returns 50
 *   safeSVGNumber("25") // returns 25
 *   safeSVGNumber(calculateLevel(profile?.xp), 1) // returns level or 1 if invalid
 */
export function safeSVGNumber(
  value: number | string | undefined | null,
  fallback: number = 0
): number {
  if (value == null) {
    return fallback;
  }

  // Convert string to number if possible
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return fallback;
    }
    return parsed;
  }

  // Handle number type
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return fallback;
    }
    return value;
  }

  return fallback;
}

/**
 * Validates that a value is a valid number before rendering an SVG component.
 * Useful for conditional rendering of SVG icons that depend on dynamic values.
 * 
 * @param value - The value to validate
 * @returns true if the value is a valid number (including 0), false otherwise
 * 
 * @example
 *   {isValidNumber(gems) && <CurrencyIcon type="GEMS" gems={gems} />}
 *   {isValidNumber(coins) && <CurrencyIcon type="GOLD" coins={coins} />}
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Sanitizes all numeric properties in an SVG element's style or attributes.
 * Useful for complex SVG calculations.
 * 
 * @param props - Object with numeric SVG properties
 * @returns Object with sanitized numeric properties
 * 
 * @example
 *   const safeProps = sanitizeSVGNumericProps({
 *     cx: calculateX(value),
 *     cy: calculateY(value),
 *     r: radius,
 *     opacity: opacityValue
 *   });
 *   <circle {...safeProps} />
 */
export function sanitizeSVGNumericProps<T extends Record<string, number | undefined | null>>(
  props: T,
  fallbacks: Partial<Record<keyof T, number>> = {}
): Record<keyof T, number> {
  const sanitized = {} as Record<keyof T, number>;
  
  for (const key in props) {
    const value = props[key];
    const fallback = fallbacks[key] ?? 0;
    sanitized[key] = safeSVGNumber(value, fallback);
  }
  
  return sanitized;
}
