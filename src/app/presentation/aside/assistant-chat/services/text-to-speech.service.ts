// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for playing back assistant messages as audio via the backend TTS endpoint.
 * @param isPlaying - Whether audio is currently playing
 * @param isLoading - Whether a TTS request is in flight
 * @param playingMessageId - The id of the message currently being played or loaded
 */
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

const TTS_ENDPOINT = 'tts/synthesize';

@Injectable({ providedIn: 'root' })
export class TextToSpeechService implements OnDestroy {
  readonly isPlaying = signal(false);
  readonly isLoading = signal(false);
  readonly playingMessageId = signal<string | null>(null);

  private readonly settings = inject(AppSettingsManagementService);
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private abortController: AbortController | null = null;
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async speak(text: string, messageId: string, locale: string): Promise<void> {
    if (this.playingMessageId() === messageId && (this.isPlaying() || this.isLoading())) {
      this.stop();
      return;
    }

    this.stop();
    this.isLoading.set(true);
    this.playingMessageId.set(messageId);

    const controller = new AbortController();
    this.abortController = controller;

    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);
      const speechSettings = this.settings.speechSettings();

      const response = await fetch(`${this.baseUrl}${TTS_ENDPOINT}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text,
          locale,
          providerId: speechSettings.ttsProvider,
          voiceId: speechSettings.ttsVoice,
        }),
      });

      if (controller.signal.aborted) {
        return;
      }

      if (!response.ok) {
        this.reset();
        return;
      }

      const blob = await response.blob();

      if (controller.signal.aborted) {
        return;
      }

      this.objectUrl = URL.createObjectURL(blob);
      this.audio = new Audio(this.objectUrl);

      this.audio.onplay = (): void => {
        this.isLoading.set(false);
        this.isPlaying.set(true);
      };

      this.audio.onended = (): void => {
        this.cleanup();
      };

      this.audio.onerror = (): void => {
        this.cleanup();
      };

      await this.audio.play();
    } catch {
      if (!controller.signal.aborted) {
        this.reset();
      }
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.cleanup();
  }

  interrupt(): void {
    if (this.isPlaying() || this.isLoading()) {
      this.stop();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private cleanup(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.audio = null;
    this.reset();
  }

  private reset(): void {
    this.isPlaying.set(false);
    this.isLoading.set(false);
    this.playingMessageId.set(null);
  }
}
