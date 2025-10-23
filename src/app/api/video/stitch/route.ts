/**
 * Video Stitching API Route
 *
 * Stitches together cinematic and UI video clips based on timeline into a single silent MP4.
 * This is part of the final assembly pipeline - audio will be added in a later step.
 *
 * POST /api/video/stitch
 *
 * Request body:
 * - timeline: Timeline with video clips
 * - shots: Record of storyboard shots by ID
 * - generatedVideos: Record of generated video URLs by shot ID
 * - generatedImages: Record of generated image URLs by shot ID (for stills)
 *
 * Response:
 * - videoUrl: base64 data URL of stitched silent video
 * - duration: Total duration in seconds
 * - processingTimeMs: Time taken to stitch
 *
 * Note: Uses /tmp directory which has 512MB limit on Vercel (see issue #102)
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import type { Timeline } from "@/types/timeline";
import type { StoryboardShot } from "@/types/storyboard";
import { isVideoClip } from "@/types/timeline";

const execAsync = promisify(exec);

interface VideoStitchRequest {
  timeline: Timeline;
  shots: Record<string, StoryboardShot>;
  generatedVideos: Record<string, { videoUrl: string }>;
  generatedImages?: Record<string, { imageUrl: string }>;
}

interface VideoStitchResponse {
  videoUrl: string; // base64 data URL
  duration: number;
  processingTimeMs: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const tempDir = path.join(tmpdir(), 'sizzle-reel-stitch');
  const tempFiles: string[] = [];

  try {
    const body: VideoStitchRequest = await request.json();

    if (!body.timeline || !body.shots || !body.generatedVideos) {
      return NextResponse.json(
        { error: "timeline, shots, and generatedVideos are required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Get video track from timeline
    const videoTrack = body.timeline.tracks.find(track => track.type === 'video');
    if (!videoTrack || videoTrack.clips.length === 0) {
      return NextResponse.json(
        { error: "No video clips found in timeline" },
        { status: 400 }
      );
    }

    // Sort clips by startTime to ensure correct order
    const videoClips = videoTrack.clips
      .filter(isVideoClip)
      .sort((a, b) => a.startTime - b.startTime);

    if (videoClips.length === 0) {
      return NextResponse.json(
        { error: "No video clips found in timeline" },
        { status: 400 }
      );
    }

    // Write each clip to a temp file
    const clipPaths: string[] = [];
    for (let i = 0; i < videoClips.length; i++) {
      const clip = videoClips[i];
      const shot = body.shots[clip.shotId];

      if (!shot) {
        throw new Error(`Shot ${clip.shotId} not found`);
      }

      // Get video source
      const videoData = body.generatedVideos[clip.shotId];
      if (!videoData?.videoUrl) {
        throw new Error(`Video not found for shot ${clip.shotId}`);
      }

      // Extract base64 data
      const base64Data = videoData.videoUrl.split(',')[1] || videoData.videoUrl;
      const videoBuffer = Buffer.from(base64Data, 'base64');

      // Write to temp file
      const clipPath = path.join(tempDir, `clip-${i}-${clip.shotId}.mp4`);
      await writeFile(clipPath, videoBuffer);
      tempFiles.push(clipPath);
      clipPaths.push(clipPath);
    }

    // Create concat file for FFmpeg
    const concatFilePath = path.join(tempDir, 'concat-list.txt');
    const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
    await writeFile(concatFilePath, concatContent);
    tempFiles.push(concatFilePath);

    // Output path
    const outputPath = path.join(tempDir, `stitched-${Date.now()}.mp4`);
    tempFiles.push(outputPath);

    // Stitch videos using FFmpeg with aspect ratio handling
    // Scale and pad each video to 1920x1080 (16:9) maintaining aspect ratio
    // Remove audio track with -an to create silent video
    // This ensures portrait and landscape videos display correctly without stretching
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 -an -y "${outputPath}"`;

    await execAsync(ffmpegCommand);

    // Read stitched video
    const { readFile } = await import('fs/promises');
    const stitchedBuffer = await readFile(outputPath);
    const stitchedBase64 = stitchedBuffer.toString('base64');
    const videoUrl = `data:video/mp4;base64,${stitchedBase64}`;

    const processingTimeMs = Date.now() - startTime;

    const result: VideoStitchResponse = {
      videoUrl,
      duration: body.timeline.totalDuration,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error("Video stitching error:", error);
    return NextResponse.json(
      {
        error: "Failed to stitch video clips",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    for (const filePath of tempFiles) {
      try {
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
  }
}
