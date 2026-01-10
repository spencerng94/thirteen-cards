/**
 * Username utility functions for handling display names and discriminators
 */

export interface ParsedUsername {
  displayName: string;
  discriminator: string;
  full: string;
}

/**
 * Parse a username into display name and discriminator
 * Handles:
 * 1. Combined format: "Name#1234" (legacy or when passed as single string)
 * 2. Separate fields: username and discriminator as separate parameters
 * 3. Missing discriminator: generates default '0000'
 */
export const parseUsername = (username: string, discriminator?: string): ParsedUsername => {
  // If discriminator is provided separately, use it
  if (discriminator && /^\d{4}$/.test(discriminator)) {
    const displayName = username || 'AGENT';
    return {
      displayName: displayName.trim().toUpperCase(),
      discriminator: discriminator,
      full: `${displayName.trim().toUpperCase()}#${discriminator}`
    };
  }
  
  // If username is empty, return default
  if (!username) {
    return { displayName: 'AGENT', discriminator: '0000', full: 'AGENT#0000' };
  }

  // Check if username contains discriminator (legacy format: "Name#1234")
  const parts = username.split('#');
  if (parts.length === 2 && parts[1].length === 4 && /^\d{4}$/.test(parts[1])) {
    return {
      displayName: parts[0].trim().toUpperCase(),
      discriminator: parts[1],
      full: username
    };
  }

  // Username without discriminator - return with default
  return {
    displayName: username.trim().toUpperCase(),
    discriminator: '0000',
    full: `${username.trim().toUpperCase()}#0000`
  };
};

/**
 * Format display name and discriminator into full username string
 */
export const formatUsername = (displayName: string, discriminator: string): string => {
  const cleanName = displayName.trim().toUpperCase();
  const cleanDiscriminator = discriminator.padStart(4, '0').slice(0, 4);
  return `${cleanName}#${cleanDiscriminator}`;
};

/**
 * Generate a random 4-digit discriminator (1000-9999 range)
 * Returns a 4-digit string for use as discriminator
 */
export const generateDiscriminator = (): string => {
  // Generate random 4-digit number between 1000 and 9999
  return Math.floor(1000 + Math.random() * 9000).toString();
};
