/**
 * Basic profanity filter utility
 * Checks text against a list of common swear words
 */

// Basic list of common swear words (case-insensitive matching)
const PROFANITY_LIST = [
  'fuck', 'fucking', 'fucked', 'fucker',
  'shit', 'shitting', 'shitted',
  'damn', 'damned', 'dammit',
  'hell',
  'ass', 'asses', 'asshole',
  'bitch', 'bitches', 'bitching',
  'bastard', 'bastards',
  'crap', 'crappy',
  'piss', 'pissing', 'pissed',
  'cunt', 'cunts',
  'dick', 'dicks', 'dickhead',
  'pussy', 'pussies',
  'slut', 'sluts',
  'whore', 'whores',
  'retard', 'retarded',
  'nigger', 'nigga', 'niggas',
  'fag', 'faggot', 'fags',
  'gay', 'gays', // Context-dependent, but included for basic filtering
  'stupid', 'stupidity',
  'idiot', 'idiots', 'idiotic',
  'moron', 'morons',
  'dumb', 'dumbass',
  'hate', 'hated', 'hating', // Context-dependent
  'kill', 'killing', 'killed', // Context-dependent
  'die', 'dying', 'died', // Context-dependent
];

/**
 * Checks if text contains any profanity
 * Uses case-insensitive matching and word boundary detection
 * 
 * @param text - The text to check
 * @returns true if profanity is detected, false otherwise
 */
export function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Normalize text: convert to lowercase and remove extra whitespace
  const normalizedText = text.toLowerCase().trim();
  
  // Check each word in the profanity list
  for (const word of PROFANITY_LIST) {
    // Use word boundary regex to match whole words only
    // This prevents false positives like "class" matching "ass"
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}
