/**
 * Username utility functions for handling display names and discriminators
 */

export interface ParsedUsername {
  displayName: string;
  discriminator: string;
  full: string;
}

/**
 * Parse a username string into display name and discriminator
 * Handles both formats: "Name#1234" and legacy "Name#1234" stored as single string
 */
export const parseUsername = (username: string): ParsedUsername => {
  if (!username) {
    return { displayName: 'AGENT', discriminator: '0000', full: 'AGENT#0000' };
  }

  const parts = username.split('#');
  if (parts.length === 2 && parts[1].length === 4 && /^\d{4}$/.test(parts[1])) {
    return {
      displayName: parts[0],
      discriminator: parts[1],
      full: username
    };
  }

  // Legacy format or invalid - return as display name with default discriminator
  return {
    displayName: username,
    discriminator: '0000',
    full: `${username}#0000`
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
 * Generate a random 4-digit discriminator
 */
export const generateDiscriminator = (): string => {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
};
