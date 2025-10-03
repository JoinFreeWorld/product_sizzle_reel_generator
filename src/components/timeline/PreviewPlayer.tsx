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

  // Get video URL for current shot
  const getCurrentVideoUrl = () => {
    const shot = currentShot.shot;
    if (shot.shotType === 'cinematic') {
      return generatedVideos[shot.id]?.videoUrl;
    } else if (shot.shotType === 'ui') {
      // For UI shots, we'd need the original screen recording
      // For now, return undefined - we'll handle this later
      return undefined;
    }
  };

  const videoUrl = getCurrentVideoUrl();
  const hasVideo = !!videoUrl;

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden max-w-3xl mx-auto">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="aspect-video flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">
              {currentShot.shot.shotType === 'cinematic'
                ? 'Generate video for this shot to preview'
                : 'UI shot preview - coming soon'}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
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
