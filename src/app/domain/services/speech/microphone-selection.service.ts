// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the user-selected audio input device id, persists it to localStorage,
 * and exposes the currently available audio input devices.
 * @param selectedDeviceId - null means OS default device
 * @param availableDevices - last result of enumerateDevices filtered to audioinput
 */
import { Injectable, signal } from '@angular/core';
import { MicrophoneTestDefaults } from 'src/app/domain/constants/microphone-test-constants';

@Injectable({ providedIn: 'root' })
export class MicrophoneSelectionService {
  private readonly _selectedDeviceId = signal<string | null>(this.loadFromStorage());
  private readonly _availableDevices = signal<MediaDeviceInfo[]>([]);

  readonly selectedDeviceId = this._selectedDeviceId.asReadonly();
  readonly availableDevices = this._availableDevices.asReadonly();

  selectDevice(id: string | null): void {
    if (id === null) {
      localStorage.removeItem(MicrophoneTestDefaults.LocalStorageKey);
    } else {
      localStorage.setItem(MicrophoneTestDefaults.LocalStorageKey, id);
    }
    this._selectedDeviceId.set(id);
  }

  async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      this._availableDevices.set([]);
      return;
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    this._availableDevices.set(all.filter((d) => d.kind === 'audioinput'));
  }

  private loadFromStorage(): string | null {
    return localStorage.getItem(MicrophoneTestDefaults.LocalStorageKey);
  }
}
