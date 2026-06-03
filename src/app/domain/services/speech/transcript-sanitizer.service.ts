// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Detects non-speech transcripts such as silence hallucinations and music/applause
 * sound annotations produced by lightweight on-device Whisper models, so the voice
 * loop does not react to ambient audio between turns.
 * @param phrases - Lookup set of known non-speech hallucination phrases (normalized)
 */
import { Injectable } from '@angular/core';
import { NonSpeechDefaults } from 'src/app/domain/constants/speech-constants';

@Injectable({ providedIn: 'root' })
export class TranscriptSanitizerService {
  private readonly phrases = new Set<string>(NonSpeechDefaults.Phrases);

  isNonSpeech(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
      return true;
    }
    if (this.isSoundAnnotation(trimmed)) {
      return true;
    }
    const normalized = trimmed.toLowerCase().replace(/[.!?…\s]+$/g, '').trim();
    return this.phrases.has(normalized);
  }

  private isSoundAnnotation(text: string): boolean {
    return /^\[.*\]$/.test(text) || /^\(.*\)$/.test(text) || /^\*.*\*$/.test(text);
  }
}
