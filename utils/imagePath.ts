/**
 * Image Path Utility
 * 
 * Utility functions for handling image file paths, particularly for converting
 * between PNG and WebP formats.
 */

/**
 * Converts a file path from .png to .webp extension.
 * Handles paths with or without extensions, and preserves directory structure.
 * 
 * @param filePath - The file path to convert (e.g., "shiba_card.png" or "round_3/shiba_card.png")
 * @returns The file path with .webp extension
 * 
 * @example
 *   convertPngToWebp('shiba_card.png') // returns 'shiba_card.webp'
 *   convertPngToWebp('round_3/shiba_card.png') // returns 'round_3/shiba_card.webp'
 *   convertPngToWebp('shiba_card.webp') // returns 'shiba_card.webp' (no change)
 *   convertPngToWebp('shiba_card') // returns 'shiba_card.webp'
 */
export function convertPngToWebp(filePath: string | null | undefined): string {
  if (!filePath) return '';
  
  // If already .webp, return as-is
  if (filePath.endsWith('.webp')) {
    return filePath;
  }
  
  // Replace .png with .webp
  if (filePath.endsWith('.png')) {
    return filePath.replace(/\.png$/i, '.webp');
  }
  
  // If no extension, add .webp
  return `${filePath}.webp`;
}

/**
 * Gets a WebP version of a file path, converting from PNG if necessary.
 * This is the main function to use when loading images from Supabase storage.
 * 
 * @param filePath - The file path from the database (may be .png or .webp)
 * @returns The file path with .webp extension
 */
export function getWebpPath(filePath: string | null | undefined): string {
  return convertPngToWebp(filePath);
}
