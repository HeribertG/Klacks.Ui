import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faMicrophone,
  faMicrophoneSlash,
  faCheck,
  faXmark,
  faPlay,
  faStop,
} from '@fortawesome/free-solid-svg-icons';
import { SpeechRecognitionService } from 'src/app/presentation/aside/llm-chat/services/speech-recognition.service';
import { Subscription } from 'rxjs';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-profile-microphone-test',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule],
  templateUrl: './profile-microphone-test.component.html',
  styleUrls: ['./profile-microphone-test.component.scss'],
})
export class ProfileMicrophoneTestComponent implements OnInit, OnDestroy {
  public translate = inject(TranslateService);
  private speechService = inject(SpeechRecognitionService);
  private subscriptions: Subscription[] = [];

  public faMicrophone = faMicrophone;
  public faMicrophoneSlash = faMicrophoneSlash;
  public faCheck = faCheck;
  public faXmark = faXmark;
  public faPlay = faPlay;
  public faStop = faStop;

  public isTestRunning = signal(false);
  public isRecording = signal(false);
  public transcribedText = signal('');
  public errorMessage = signal('');
  public testResults = signal<TestResult[]>([]);
  public defaultMicrophone = signal<string>('');

  public isWhisperLoading = this.speechService.isWhisperLoading;
  public whisperLoadProgress = this.speechService.whisperLoadProgress;
  public isWhisperModelLoaded = this.speechService.isWhisperModelLoaded;

  ngOnInit(): void {
    this.loadDefaultMicrophone();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.isRecording()) {
      this.speechService.stopListening();
    }
  }

  async loadDefaultMicrophone(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const defaultDevice = devices.find((d) => d.kind === 'audioinput' && d.deviceId === 'default');
      const firstDevice = devices.find((d) => d.kind === 'audioinput');

      const label = defaultDevice?.label || firstDevice?.label || 'Default Microphone';
      this.defaultMicrophone.set(label.replace('Default - ', ''));
    } catch {
      this.defaultMicrophone.set('');
    }
  }

  async runDiagnostics(): Promise<void> {
    this.isTestRunning.set(true);
    this.errorMessage.set('');
    this.transcribedText.set('');

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

  startRecording(): void {
    if (this.isRecording()) {
      this.speechService.stopListening();
      this.isRecording.set(false);
      return;
    }

    this.transcribedText.set('');
    this.errorMessage.set('');
    this.isRecording.set(true);

    const resultSub = this.speechService.startListening('de-DE').subscribe({
      next: (text) => {
        this.transcribedText.set(text);
        this.isRecording.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Recording error');
        this.isRecording.set(false);
      },
    });
    this.subscriptions.push(resultSub);

    const errorSub = this.speechService.errors.subscribe((error) => {
      this.errorMessage.set(error);
      this.isRecording.set(false);
    });
    this.subscriptions.push(errorSub);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
