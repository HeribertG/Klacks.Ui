// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for EarconService: lazy AudioContext creation/reuse, tone scheduling,
 * and graceful no-op when the Web Audio API is unavailable.
 */
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EarconService } from './earcon.service';
import { EarconDefaults } from 'src/app/domain/constants/speech-constants';

interface MockOscillator {
  type: OscillatorType | null;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

interface MockGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

describe('EarconService', () => {
  let service: EarconService;
  let createdContexts: number;
  let oscillators: MockOscillator[];
  let gains: MockGain[];
  let resumeMock: ReturnType<typeof vi.fn>;
  let contextState: AudioContextState;
  let originalAudioContext: typeof AudioContext | undefined;

  const makeOscillator = (): MockOscillator => ({
    type: null,
    frequency: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  });

  const makeGain = (): MockGain => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });

  beforeEach(() => {
    createdContexts = 0;
    oscillators = [];
    gains = [];
    resumeMock = vi.fn().mockResolvedValue(undefined);
    contextState = 'running';
    originalAudioContext = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;

    (globalThis as unknown as { AudioContext: unknown }).AudioContext = function MockAudioContext(this: unknown) {
      createdContexts++;
      return {
        currentTime: 0,
        destination: {},
        get state() {
          return contextState;
        },
        resume: resumeMock,
        close: vi.fn().mockResolvedValue(undefined),
        createOscillator: () => {
          const oscillator = makeOscillator();
          oscillators.push(oscillator);
          return oscillator;
        },
        createGain: () => {
          const gain = makeGain();
          gains.push(gain);
          return gain;
        },
      } as unknown as AudioContext;
    };

    TestBed.configureTestingModule({ providers: [EarconService] });
    service = TestBed.inject(EarconService);
  });

  afterEach(() => {
    if (originalAudioContext) {
      (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext = originalAudioContext;
    } else {
      delete (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    }
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not create an AudioContext before the first earcon (lazy)', () => {
    expect(createdContexts).toBe(0);
  });

  it('schedules one ascending sine tone per configured frequency', () => {
    service.playProcessingEarcon();

    expect(oscillators.length).toBe(EarconDefaults.ProcessingToneFrequenciesHz.length);
    oscillators.forEach((oscillator, index) => {
      expect(oscillator.type).toBe(EarconDefaults.ToneType);
      expect(oscillator.frequency.value).toBe(EarconDefaults.ProcessingToneFrequenciesHz[index]);
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).toHaveBeenCalledTimes(1);
    });
  });

  it('staggers the tones so the second starts after the first ends', () => {
    service.playProcessingEarcon();

    const firstStart = oscillators[0].start.mock.calls[0][0] as number;
    const secondStart = oscillators[1].start.mock.calls[0][0] as number;
    const spacingSeconds =
      (EarconDefaults.ToneDurationMs + EarconDefaults.ToneGapMs) / EarconDefaults.MillisecondsPerSecond;

    expect(secondStart - firstStart).toBeCloseTo(spacingSeconds, 5);
  });

  it('applies a soft gain envelope (attack ramp up, release ramp down to zero)', () => {
    service.playProcessingEarcon();

    const gain = gains[0];
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(EarconDefaults.ToneGain, expect.any(Number));
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
  });

  it('reuses the same AudioContext across earcons', () => {
    service.playProcessingEarcon();
    service.playProcessingEarcon();

    expect(createdContexts).toBe(1);
  });

  it('resumes a suspended AudioContext before playing', () => {
    service.playProcessingEarcon();
    contextState = 'suspended';

    service.playProcessingEarcon();

    expect(resumeMock).toHaveBeenCalled();
  });

  it('disconnects oscillator and gain when a tone ends', () => {
    service.playProcessingEarcon();

    oscillators[0].onended?.();

    expect(oscillators[0].disconnect).toHaveBeenCalled();
    expect(gains[0].disconnect).toHaveBeenCalled();
  });

  it('is a silent no-op when the Web Audio API is unavailable', () => {
    delete (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;

    expect(() => service.playProcessingEarcon()).not.toThrow();
    expect(oscillators.length).toBe(0);
  });
});
