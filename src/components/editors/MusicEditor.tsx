"use client";

import { Input } from "@/components/ui/input";
import { EditablePromptButton } from "./EditablePromptButton";
import type { MusicGenerationResponse } from "@/types/music";

interface MusicEditorProps {
  musicPrompt: string;
  generatedMusic: MusicGenerationResponse | null;
  generatingMusic: boolean;
  requestedDurationMs: number;
  onGenerateMusic: (prompt: string) => void;
}

export function MusicEditor({
  musicPrompt,
  generatedMusic,
  generatingMusic,
  requestedDurationMs,
  onGenerateMusic,
}: MusicEditorProps) {
  return (
    <div className="border-l-4 border-blue-500 pl-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium">
          Background Music
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        AI-generated instrumental music for your sizzle reel
      </p>

      {/* Duration Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Requested Duration</label>
          <Input
            value={`${(requestedDurationMs / 1000).toFixed(1)}s`}
            readOnly
            className="mt-1"
          />
        </div>
        {generatedMusic?.actualDurationSeconds && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Actual Duration</label>
            <Input
              value={`${generatedMusic.actualDurationSeconds.toFixed(1)}s`}
              readOnly
              className="mt-1"
            />
          </div>
        )}
      </div>

      {/* Music Prompt with EditablePromptButton */}
      {generatedMusic ? (
        <EditablePromptButton
          initialPrompt={musicPrompt}
          promptLabel="Music Prompt"
          buttonContent={generatingMusic ? "Generating..." : "Regenerate Music"}
          onGenerate={onGenerateMusic}
          disabled={generatingMusic}
          variant="outline"
        />
      ) : (
        <EditablePromptButton
          initialPrompt={musicPrompt}
          promptLabel="Music Prompt"
          buttonContent={generatingMusic ? "Generating..." : "Generate Music"}
          onGenerate={onGenerateMusic}
          disabled={generatingMusic}
          variant="default"
        />
      )}

      {/* Generated Music Player */}
      {generatedMusic && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Generated Music</label>
          <audio
            src={generatedMusic.audioUrl}
            controls
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Generated in {(generatedMusic.processingTimeMs / 1000).toFixed(1)}s
          </p>
        </div>
      )}

      {generatingMusic && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span>Generating background music...</span>
        </div>
      )}
    </div>
  );
}
