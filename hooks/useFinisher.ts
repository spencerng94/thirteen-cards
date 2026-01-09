import { useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase, Finisher } from '../services/supabase';

export const useFinisher = (winnerId: string, profile: UserProfile | null) => {
  const [equippedFinisher, setEquippedFinisher] = useState<string | null>(null);
  const [finisherData, setFinisherData] = useState<Finisher | null>(null);

  // Fetch equipped finisher from profile
  // Retry Logic for Aborts: Retry if AbortError is detected
  const loadEquippedFinisher = useCallback(async (attempt = 1): Promise<Finisher | null> => {
    if (!profile || !profile.equipped_finisher) {
      setEquippedFinisher(null);
      setFinisherData(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('finishers')
        .select('*')
        .eq('animation_key', profile.equipped_finisher)
        .single();

      if (error) {
        // Check if it's an AbortError and retry
        if ((error.name === 'AbortError' || error.message?.includes('aborted')) && attempt < 3) {
          console.warn(`loadEquippedFinisher: AbortError on attempt ${attempt}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
          return loadEquippedFinisher(attempt + 1);
        }
        console.warn('Finisher not found:', profile.equipped_finisher);
        setEquippedFinisher(null);
        setFinisherData(null);
        return null;
      }

      if (!data) {
        setEquippedFinisher(null);
        setFinisherData(null);
        return null;
      }

      setEquippedFinisher(profile.equipped_finisher);
      setFinisherData(data as Finisher);
      return data as Finisher;
    } catch (e: any) {
      // Check if it's an AbortError and retry
      if ((e?.name === 'AbortError' || e?.message?.includes('aborted')) && attempt < 3) {
        console.warn(`loadEquippedFinisher: AbortError exception on attempt ${attempt}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
        return loadEquippedFinisher(attempt + 1);
      }
      console.error('Error loading finisher:', e);
      setEquippedFinisher(null);
      setFinisherData(null);
      return null;
    }
  }, [profile]);

  // Trigger finisher animation - globally accessible
  const triggerFinisher = useCallback((): boolean => {
    // Only trigger if winner matches current user and has equipped finisher
    if (!profile || profile.id !== winnerId || !equippedFinisher) {
      return false;
    }

    return true;
  }, [profile, winnerId, equippedFinisher]);

  return {
    equippedFinisher,
    finisherData,
    loadEquippedFinisher,
    triggerFinisher,
    shouldShowFinisher: triggerFinisher()
  };
};

// Global finisher trigger function for use in match end logic
export const TriggerFinisher = (winnerId: string, profile: UserProfile | null): boolean => {
  if (!profile || profile.id !== winnerId || !profile.equipped_finisher) {
    return false;
  }
  return true;
};
