"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StoryboardShot, NarrationSegment } from "@/types/storyboard";

interface PreviewPlayerProps {
  shots: StoryboardShot[];
  narration?: NarrationSegment[];
  generatedVideos: Record<string, { videoUrl: string }>;
  generatedNarration: Record<string, { audioUrl: string }>;
  onTimeUpdate?: (time: number) => void;
  seekTime?: number;
}

export function PreviewPlayer({
  shots,
  narration,
  generatedVideos,
  generatedNarration,
  onTimeUpdate,
  seekTime,
}: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Calculate shot durations and positions
  const shotTimeline = shots.map((shot, index) => {
    const duration = shot.shotType === 'ui'
      ? shot.endTime - shot.startTime
      : 8;
    const startTime = shots.slice(0, index).reduce((acc, s) => {
      return acc + (s.shotType === 'ui' ? s.endTime - s.startTime : 8);
    }, 0);
    return { shot, duration, startTime, endTime: startTime + duration };
  });

  const currentShot = shotTimeline[currentShotIndex];
  const totalDuration = shotTimeline[shotTimeline.length - 1]?.endTime || 0;

  // Get video URL for current shot (only cinematic shots for now)
  const videoUrl = currentShot.shot.shotType === 'cinematic'
    ? generatedVideos[currentShot.shot.id]?.videoUrl
    : undefined;

  const hasVideo = !!videoUrl;

  // Handle seeking
  useEffect(() => {
    if (seekTime !== undefined && videoRef.current) {
      // Find which shot this time belongs to
      const shotIndex = shotTimeline.findIndex(
        (st) => seekTime >= st.startTime && seekTime < st.endTime
      );
      if (shotIndex !== -1 && shotIndex !== currentShotIndex) {
        setCurrentShotIndex(shotIndex);
        setCurrentTime(seekTime);
        // Seek within the video
        const timeInShot = seekTime - shotTimeline[shotIndex].startTime;
        videoRef.current.currentTime = timeInShot;
      }
    }
  }, [seekTime]);

  // Handle video time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const timeInShot = videoRef.current.currentTime;
    const absoluteTime = currentShot.startTime + timeInShot;
    setCurrentTime(absoluteTime);
    onTimeUpdate?.(absoluteTime);

    // Check if we need to move to next shot
    if (timeInShot >= currentShot.duration) {
      if (currentShotIndex < shots.length - 1) {
        setCurrentShotIndex(currentShotIndex + 1);
        videoRef.current.currentTime = 0;
      } else {
        setIsPlaying(false);
        videoRef.current.pause();
      }
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden max-w-3xl mx-auto aspect-video flex items-center justify-center">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-h-full max-w-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-center space-y-2">
            <p className="text-muted-foreground font-medium">
              {currentShot.shot.shotType === 'cinematic'
                ? 'Generate video for this shot to preview'
                : 'UI shot - extract clip to preview (coming soon)'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={() => {
            setCurrentShotIndex(0);
            setCurrentTime(0);
            setIsPlaying(false);
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.pause();
              videoRef.current.load(); // Force reload the video
            }
          }}
          disabled={!hasVideo}
          variant="outline"
        >
          Restart
        </Button>
        <Button onClick={handlePlayPause} disabled={!hasVideo}>
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <span className="text-sm text-muted-foreground font-mono">
          {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
        </span>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Current: Shot {currentShot.shot.order} - {currentShot.shot.title}
      </div>
    </div>
  );
}
