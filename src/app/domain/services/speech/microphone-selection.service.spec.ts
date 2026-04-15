// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { MicrophoneSelectionService } from './microphone-selection.service';
import { MicrophoneTestDefaults } from 'src/app/domain/constants/microphone-test-constants';

describe('MicrophoneSelectionService', () => {
  let originalEnumerate: typeof navigator.mediaDevices.enumerateDevices;

  beforeEach(() => {
    localStorage.clear();
    originalEnumerate = navigator.mediaDevices?.enumerateDevices;
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        configurable: true,
        value: originalEnumerate,
      });
    }
  });

  function mockEnumerate(devices: Partial<MediaDeviceInfo>[]): void {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        ...navigator.mediaDevices,
        enumerateDevices: () => Promise.resolve(devices as MediaDeviceInfo[]),
      },
    });
  }

  it('initializes selectedDeviceId from localStorage when present', () => {
    localStorage.setItem(MicrophoneTestDefaults.LocalStorageKey, 'mic-42');
    const service = TestBed.inject(MicrophoneSelectionService);
    expect(service.selectedDeviceId()).toBe('mic-42');
  });

  it('initializes selectedDeviceId to null when localStorage empty', () => {
    const service = TestBed.inject(MicrophoneSelectionService);
    expect(service.selectedDeviceId()).toBeNull();
  });

  it('selectDevice writes to localStorage', () => {
    const service = TestBed.inject(MicrophoneSelectionService);
    service.selectDevice('mic-9');
    expect(localStorage.getItem(MicrophoneTestDefaults.LocalStorageKey)).toBe('mic-9');
    expect(service.selectedDeviceId()).toBe('mic-9');
  });

  it('selectDevice(null) removes from localStorage', () => {
    localStorage.setItem(MicrophoneTestDefaults.LocalStorageKey, 'mic-1');
    const service = TestBed.inject(MicrophoneSelectionService);
    service.selectDevice(null);
    expect(localStorage.getItem(MicrophoneTestDefaults.LocalStorageKey)).toBeNull();
    expect(service.selectedDeviceId()).toBeNull();
  });

  it('refreshDevices filters audioinput only', async () => {
    mockEnumerate([
      { kind: 'audioinput', deviceId: 'a', label: 'Mic A', groupId: 'g1' },
      { kind: 'videoinput', deviceId: 'v', label: 'Cam', groupId: 'g2' },
      { kind: 'audiooutput', deviceId: 'o', label: 'Out', groupId: 'g3' },
      { kind: 'audioinput', deviceId: 'b', label: 'Mic B', groupId: 'g4' },
    ]);
    const service = TestBed.inject(MicrophoneSelectionService);
    await service.refreshDevices();
    const devices = service.availableDevices();
    expect(devices.length).toBe(2);
    expect(devices.map((d) => d.deviceId)).toEqual(['a', 'b']);
  });
});
