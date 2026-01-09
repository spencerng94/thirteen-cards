import { useState } from 'react';
import { supabase } from '../src/lib/supabase';

export type ReportType = 
  | 'offensive_content' 
  | 'harassment' 
  | 'spam' 
  | 'inappropriate_username' 
  | 'inappropriate_emote' 
  | 'other';

export interface ReportUserParams {
  reportedUserId: string;
  reportType: ReportType;
  description?: string;
  reportedContent?: string; // The specific content that was reported (username, emote, etc.)
}

export interface ReportUserResult {
  success: boolean;
  error?: string;
  reportId?: string;
}

/**
 * Hook for reporting users who post objectionable content
 * Required for App Store and Google Play UGC compliance
 */
export const useReportUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportUser = async (params: ReportUserParams): Promise<ReportUserResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        throw new Error('You must be logged in to report users');
      }

      // Validate inputs
      if (!params.reportedUserId || typeof params.reportedUserId !== 'string') {
        throw new Error('Invalid user ID');
      }

      if (!params.reportType || !['offensive_content', 'harassment', 'spam', 'inappropriate_username', 'inappropriate_emote', 'other'].includes(params.reportType)) {
        throw new Error('Invalid report type');
      }

      // Prevent self-reporting
      if (session.user.id === params.reportedUserId) {
        throw new Error('You cannot report yourself');
      }

      // Insert report into database
      const { data, error: insertError } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: session.user.id,
          reported_user_id: params.reportedUserId,
          report_type: params.reportType,
          description: params.description || null,
          reported_content: params.reportedContent || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to submit report');
      }

      setIsLoading(false);
      return {
        success: true,
        reportId: data.id
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit report. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  return {
    reportUser,
    isLoading,
    error
  };
};

/**
 * Standalone function for reporting users (for use outside of React components)
 */
export const reportUser = async (params: ReportUserParams): Promise<ReportUserResult> => {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return { success: false, error: 'You must be logged in to report users' };
    }

    // Validate inputs
    if (!params.reportedUserId || typeof params.reportedUserId !== 'string') {
      return { success: false, error: 'Invalid user ID' };
    }

    if (!params.reportType || !['offensive_content', 'harassment', 'spam', 'inappropriate_username', 'inappropriate_emote', 'other'].includes(params.reportType)) {
      return { success: false, error: 'Invalid report type' };
    }

    // Prevent self-reporting
    if (session.user.id === params.reportedUserId) {
      return { success: false, error: 'You cannot report yourself' };
    }

    // Insert report into database
    const { data, error: insertError } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: session.user.id,
        reported_user_id: params.reportedUserId,
        report_type: params.reportType,
        description: params.description || null,
        reported_content: params.reportedContent || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message || 'Failed to submit report' };
    }

    return {
      success: true,
      reportId: data.id
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to submit report. Please try again.'
    };
  }
};
