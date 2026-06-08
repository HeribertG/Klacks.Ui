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
  private readonly baseUrl = environment.baseAssistantUrl || `${environment.baseUrl}assistant/`;

  async speak(text: string, messageId: string, locale: string): Promise<void> {
    if (this.playingMessageId() === messageId && (this.isPlaying() || this.isLoading())) {
      this.stop();
      return;
    }

    this.stop();
    this.isLoading.set(true);
    this.playingMessageId.set(messageId);

    try {
      const token = localStorage.getItem(StorageKeys.TOKEN);
      const speechSettings = this.settings.speechSettings();

      const response = await fetch(`${this.baseUrl}${TTS_ENDPOINT}`, {
        method: 'POST',
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

      if (!response.ok) {
        this.reset();
        return;
      }

      const blob = await response.blob();
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
      this.reset();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.cleanup();
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
