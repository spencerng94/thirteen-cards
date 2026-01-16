import { supabase, supabaseUrl } from '../src/lib/supabase';

/**
 * Image Optimization Utility for Supabase Storage
 * Requests resized versions of assets using Supabase's image transformation service
 * to avoid loading 2MB+ assets for small thumbnails.
 * 
 * Supabase Storage supports image transformation via query parameters:
 * - ?width=200 - Resize to specific width
 * - ?height=200 - Resize to specific height
 * - ?resize=cover - Resize mode
 * - ?quality=80 - JPEG quality (0-100)
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Get optimized image URL from Supabase Storage
 * @param bucket - Storage bucket name (e.g., 'emotes', 'sleeves', 'icons')
 * @param path - Path to the image file
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export const getOptimizedImageUrl = (
  bucket: string,
  path: string,
  options: ImageTransformOptions = {}
): string => {
  try {
    const { data, error } = supabase.storage.from(bucket).getPublicUrl(path);
    
    if (error || !data?.publicUrl) {
      console.warn(`Failed to get public URL for ${bucket}/${path}:`, error);
      // Fallback to manual URL construction
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
    }

    const url = new URL(data.publicUrl);
    
    // Add transformation parameters
    if (options.width) {
      url.searchParams.set('width', options.width.toString());
    }
    if (options.height) {
      url.searchParams.set('height', options.height.toString());
    }
    if (options.quality !== undefined) {
      url.searchParams.set('quality', options.quality.toString());
    }
    if (options.resize) {
      url.searchParams.set('resize', options.resize);
    }

    // Add cache control hint (browser will respect this)
    url.searchParams.set('cache', 'public,max-age=31536000');

    return url.toString();
  } catch (error) {
    console.error(`Error optimizing image URL for ${bucket}/${path}:`, error);
    // Fallback to unoptimized URL
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
  }
};

/**
 * Get thumbnail URL for Shop items (200px width, optimized quality)
 */
export const getShopThumbnailUrl = (bucket: string, path: string): string => {
  return getOptimizedImageUrl(bucket, path, {
    width: 200,
    quality: 85,
    resize: 'cover'
  });
};

/**
 * Get preview URL for larger previews (400px width)
 */
export const getShopPreviewUrl = (bucket: string, path: string): string => {
  return getOptimizedImageUrl(bucket, path, {
    width: 400,
    quality: 90,
    resize: 'cover'
  });
};

/**
 * Get full-size URL (no transformation, for high-quality previews)
 */
export const getFullSizeUrl = (bucket: string, path: string): string => {
  return getOptimizedImageUrl(bucket, path, {
    quality: 100
  });
};
