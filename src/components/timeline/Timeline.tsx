"use client";

import { StoryboardShot, NarrationSegment } from "@/types/storyboard";

interface TimelineProps {
  shots: StoryboardShot[];
  narration?: NarrationSegment[];
  totalDuration: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function Timeline({ shots, narration, totalDuration, currentTime = 0, onSeek }: TimelineProps) {
  const timelineWidth = 800; // pixels
  const pixelsPerSecond = timelineWidth / totalDuration;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  };

  // Calculate cumulative shot positions
  let cumulativeTime = 0;
  const shotPositions = shots.map((shot) => {
    const start = cumulativeTime;
    const duration = shot.shotType === 'ui'
      ? shot.endTime - shot.startTime
      : 8; // cinematic shots are 8 seconds
    cumulativeTime += duration;
    return { shot, start, duration };
  });

  return (
    <div className="space-y-2">
      {/* Time markers */}
      <div className="relative" style={{ width: timelineWidth }}>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
            <span key={i} className="font-mono">{(i * 5).toFixed(0)}s</span>
          ))}
        </div>
      </div>

      {/* Shot blocks */}
      <div
        className="relative bg-muted rounded cursor-pointer"
        style={{ width: timelineWidth, height: 60 }}
        onClick={handleClick}
      >
        {shotPositions.map(({ shot, start, duration }, index) => (
          <div
            key={shot.id}
            className="absolute top-0 bottom-0 border-r border-background"
            style={{
              left: start * pixelsPerSecond,
              width: duration * pixelsPerSecond,
              background: shot.shotType === 'cinematic'
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            <div className="p-2 text-xs text-white font-medium truncate">
              Shot {shot.order}: {shot.title}
            </div>
            <div className="absolute bottom-1 right-1 text-xs text-white/70 font-mono">
              {duration.toFixed(1)}s
            </div>
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: currentTime * pixelsPerSecond }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Narration segments */}
      {narration && narration.length > 0 && (
        <div
          className="relative bg-muted/50 rounded"
          style={{ width: timelineWidth, height: 40 }}
        >
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs text-muted-foreground font-medium">Narration</span>
          </div>
          {narration.map((segment) => (
            <div
              key={segment.id}
              className="absolute top-1 bottom-1 bg-purple-500/70 rounded border border-purple-600"
              style={{
                left: segment.startTime * pixelsPerSecond,
                width: (segment.endTime - segment.startTime) * pixelsPerSecond,
              }}
              title={segment.text}
            >
              <div className="px-1 text-xs text-white/90 truncate">
                {segment.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total duration */}
      <div className="text-xs text-muted-foreground text-right font-mono" style={{ width: timelineWidth }}>
        Total: {totalDuration.toFixed(1)}s
      </div>
    </div>
  );
}
