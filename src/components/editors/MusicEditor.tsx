"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { MusicGenerationResponse } from "@/types/music";

interface MusicEditorProps {
  musicPrompt: string;
  generatedMusic: MusicGenerationResponse | null;
  generatingMusic: boolean;
  requestedDurationMs: number;
  onGenerateMusic: (prompt: string) => void;
}

export function MusicEditor({
  musicPrompt: initialPrompt,
  generatedMusic,
  generatingMusic,
  requestedDurationMs,
  onGenerateMusic,
}: MusicEditorProps) {
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = () => {
    onGenerateMusic(editedPrompt);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(initialPrompt);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Background Music</CardTitle>
        <CardDescription>
          AI-generated instrumental music for your sizzle reel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* Music Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Music Prompt</label>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
          {isEditing ? (
            <>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generatingMusic || !editedPrompt.trim()}
                  size="sm"
                >
                  {generatingMusic ? "Generating..." : generatedMusic ? "Regenerate Music" : "Generate Music"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={generatingMusic}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-muted rounded-md p-3">
              <p className="text-sm font-mono whitespace-pre-wrap">{editedPrompt}</p>
            </div>
          )}
        </div>

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

        {/* Generate Button (when no music exists) */}
        {!generatedMusic && !isEditing && (
          <Button
            onClick={() => onGenerateMusic(editedPrompt)}
            disabled={generatingMusic}
            className="w-full"
          >
            {generatingMusic ? "Generating Music..." : "Generate Music"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
