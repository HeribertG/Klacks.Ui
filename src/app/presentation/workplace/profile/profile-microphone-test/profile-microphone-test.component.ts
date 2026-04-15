// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Profile screen for microphone diagnostics: device selection, capability checks,
 * and a record/playback test using the selected device.
 */
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faMicrophone,
  faCheck,
  faXmark,
  faPlay,
  faStop,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { MicrophoneSelectionService } from 'src/app/domain/services/speech/microphone-selection.service';
import { MicrophoneTestDefaults } from 'src/app/domain/constants/microphone-test-constants';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-profile-microphone-test',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FontAwesomeModule],
  templateUrl: './profile-microphone-test.component.html',
  styleUrls: ['./profile-microphone-test.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMicrophoneTestComponent implements OnInit, OnDestroy {
  private speechService = inject(SpeechRecognitionService);
  private micSelection = inject(MicrophoneSelectionService);

  public faMicrophone = faMicrophone;
  public faCheck = faCheck;
  public faXmark = faXmark;
  public faPlay = faPlay;
  public faStop = faStop;
  public faRotate = faRotate;

  public isTestRunning = signal(false);
  public errorMessage = signal('');
  public testResults = signal<TestResult[]>([]);
  public transcribedText = signal('');

  public availableDevices = this.micSelection.availableDevices;
  public selectedDeviceId = this.micSelection.selectedDeviceId;
  public hasDeviceLabels = computed(() =>
    this.availableDevices().some((d) => d.label && d.label.length > 0),
  );
  public hasNoDevices = computed(() => this.availableDevices().length === 0);

  public isPlaybackRecording = signal(false);
  public playbackUrl = signal<string | null>(null);
  public levelBars = signal<number[]>(
    new Array<number>(MicrophoneTestDefaults.LevelMeterBarCount).fill(0),
  );

  public isWhisperLoading = this.speechService.isWhisperLoading;
  public whisperLoadProgress = this.speechService.whisperLoadProgress;
  public isWhisperModelLoaded = this.speechService.isWhisperModelLoaded;
  public isTranscribing = this.speechService.isTranscribing;

  private mediaRecorder: MediaRecorder | null = null;
  private playbackStream: MediaStream | null = null;
  private playbackChunks: Blob[] = [];
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private analyserContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.micSelection.refreshDevices();
  }

  ngOnDestroy(): void {
    this.stopRecordPlayback();
    this.stopLevelMeter();
    this.playbackStream?.getTracks().forEach((t) => t.stop());
    this.disposePlayback();
  }

  onDeviceChange(value: string): void {
    this.micSelection.selectDevice(value === '' ? null : value);
  }

  async refreshDevices(): Promise<void> {
    await this.micSelection.refreshDevices();
  }

  async runDiagnostics(): Promise<void> {
    this.isTestRunning.set(true);
    this.errorMessage.set('');

    const results: TestResult[] = [
      { name: 'setting.microphone-test.test-secure-context', status: 'pending' },
      { name: 'setting.microphone-test.test-media-devices', status: 'pending' },
      { name: 'setting.microphone-test.test-microphone-access', status: 'pending' },
      { name: 'setting.microphone-test.test-speech-api', status: 'pending' },
    ];
    this.testResults.set([...results]);

    results[0].status = 'running';
    this.testResults.set([...results]);
    await this.delay(300);

    if (window.isSecureContext) {
      results[0].status = 'success';
      results[0].message = 'HTTPS/localhost';
    } else {
      results[0].status = 'error';
      results[0].message = 'HTTP - HTTPS required';
      this.testResults.set([...results]);
      this.isTestRunning.set(false);
      return;
    }
    this.testResults.set([...results]);

    results[1].status = 'running';
    this.testResults.set([...results]);
    await this.delay(300);

    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      results[1].status = 'success';
    } else {
      results[1].status = 'error';
      results[1].message = 'MediaDevices API not available';
      this.testResults.set([...results]);
      this.isTestRunning.set(false);
      return;
    }
    this.testResults.set([...results]);

    results[2].status = 'running';
    this.testResults.set([...results]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      results[2].status = 'success';
    } catch (error: unknown) {
      results[2].status = 'error';
      results[2].message = error instanceof Error ? error.message : 'Microphone access denied';
      this.testResults.set([...results]);
      this.isTestRunning.set(false);
      return;
    }
    this.testResults.set([...results]);

    results[3].status = 'running';
    this.testResults.set([...results]);
    await this.delay(300);

    const diagnostics = this.speechService.getDiagnostics();
    if (diagnostics.useWhisperFallback) {
      results[3].status = 'success';
      results[3].message = `Whisper (${diagnostics.browserName})`;
    } else if (diagnostics.speechRecognitionAvailable || diagnostics.webkitSpeechRecognitionAvailable) {
      results[3].status = 'success';
      results[3].message = `Web Speech API (${diagnostics.browserName})`;
    } else {
      results[3].status = 'error';
      results[3].message = 'No speech API available';
    }
    this.testResults.set([...results]);

    this.isTestRunning.set(false);
  }

  async toggleRecordPlayback(): Promise<void> {
    if (this.isPlaybackRecording()) {
      this.stopRecordPlayback();
      return;
    }

    this.errorMessage.set('');
    this.transcribedText.set('');
    this.disposePlayback();

    const deviceId = this.micSelection.selectedDeviceId();
    const audio: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : {};

    try {
      this.playbackStream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Microphone access denied');
      return;
    }

    this.startLevelMeter(this.playbackStream);
    this.playbackChunks = [];
    this.mediaRecorder = new MediaRecorder(this.playbackStream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.playbackChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.playbackChunks, {
        type: this.mediaRecorder?.mimeType ?? 'audio/webm',
      });
      this.playbackUrl.set(URL.createObjectURL(blob));
      this.stopLevelMeter();
      this.playbackStream?.getTracks().forEach((t) => t.stop());
      this.playbackStream = null;
      this.isPlaybackRecording.set(false);
      this.transcribeRecording(blob);
    };
    this.mediaRecorder.start();
    this.isPlaybackRecording.set(true);
    this.autoStopTimer = setTimeout(
      () => this.stopRecordPlayback(),
      MicrophoneTestDefaults.MaxRecordingDurationMs,
    );
  }

  private async transcribeRecording(blob: Blob): Promise<void> {
    try {
      const text = await this.speechService.transcribeBlob(blob, 'de');
      this.transcribedText.set(text);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Transcription failed');
    }
  }

  stopRecordPlayback(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private startLevelMeter(stream: MediaStream): void {
    this.analyserContext = new AudioContext();
    const source = this.analyserContext.createMediaStreamSource(stream);
    this.analyser = this.analyserContext.createAnalyser();
    this.analyser.fftSize = MicrophoneTestDefaults.AnalyserFftSize;
    source.connect(this.analyser);

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.levelTimer = setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const v of buffer) {
        const centred = (v - 128) / 128;
        sum += centred * centred;
      }
      const rms = Math.sqrt(sum / buffer.length);
      const filled = Math.min(
        MicrophoneTestDefaults.LevelMeterBarCount,
        Math.round(rms * MicrophoneTestDefaults.LevelMeterBarCount * 4),
      );
      this.levelBars.set(
        Array.from({ length: MicrophoneTestDefaults.LevelMeterBarCount }, (_, i) =>
          i < filled ? 1 : 0,
        ),
      );
    }, MicrophoneTestDefaults.LevelMeterUpdateIntervalMs);
  }

  private stopLevelMeter(): void {
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    this.analyser?.disconnect();
    this.analyser = null;
    this.analyserContext?.close();
    this.analyserContext = null;
    this.levelBars.set(new Array<number>(MicrophoneTestDefaults.LevelMeterBarCount).fill(0));
  }

  private disposePlayback(): void {
    const url = this.playbackUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.playbackUrl.set(null);
    }
    this.playbackChunks = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
