/**
 * Version Configuration
 * Update this constant when deploying a new version
 */
export const CURRENT_VERSION = '1.0.1';

/**
 * Version comparison helper
 * Returns true if version1 is newer than version2
 */
export const compareVersions = (version1: string, version2: string): boolean => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return true;
    if (v1Part < v2Part) return false;
  }
  
  return false; // Versions are equal
};
