/**
 * Video compression utility for reducing file sizes before API processing.
 *
 * Compresses videos larger than 10MB to stay within API limits while
 * maintaining acceptable quality for analysis.
 */

export interface CompressionResult {
  compressedVideo: string;
  compressedSize: number;
  compressionRatio: number;
}

export interface CompressVideoOptions {
  videoData: string;
  filename: string;
  targetSizeMB?: number;
  onProgress?: (status: string) => void;
}

const MAX_SIZE_MB = 10;
const DEFAULT_TARGET_SIZE_MB = 9;

/**
 * Determines if a video needs compression based on file size.
 */
export function needsCompression(fileSizeBytes: number): boolean {
  const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
  return fileSizeBytes > maxSizeBytes;
}

/**
 * Compresses a video using the server-side compression API.
 *
 * @param options - Compression options
 * @returns Compressed video data and metadata
 * @throws Error if compression fails
 */
export async function compressVideo({
  videoData,
  filename,
  targetSizeMB = DEFAULT_TARGET_SIZE_MB,
  onProgress,
}: CompressVideoOptions): Promise<CompressionResult> {
  onProgress?.(`Compressing ${filename}...`);

  const response = await fetch("/api/video/compress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videoData,
      targetSizeMB,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to compress video");
  }

  const result: CompressionResult = await response.json();

  // Log compression stats
  const originalSizeMB = (videoData.length * 3) / 4 / 1024 / 1024; // base64 size estimate
  const compressedSizeMB = result.compressedSize / 1024 / 1024;
  console.log(
    `${filename} compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${(result.compressionRatio * 100).toFixed(0)}%)`
  );

  return result;
}

/**
 * Helper function to compress a video if needed, otherwise return original data.
 *
 * @param videoData - Base64 encoded video data
 * @param filename - Video filename for logging
 * @param fileSizeBytes - Original file size in bytes
 * @param onProgress - Optional progress callback
 * @returns Compressed or original video data
 */
export async function compressVideoIfNeeded(
  videoData: string,
  filename: string,
  fileSizeBytes: number,
  onProgress?: (status: string) => void
): Promise<string> {
  if (!needsCompression(fileSizeBytes)) {
    return videoData;
  }

  const result = await compressVideo({
    videoData,
    filename,
    onProgress,
  });

  return result.compressedVideo;
}
