// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PLAYGROUND_DEVICE_HEADER } from 'src/app/domain/constants/playground.constants';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { PlaygroundStatusGateService } from 'src/app/domain/services/playground/playground-status-gate.service';
import { environment } from 'src/environments/environment';
import { PlaygroundDeviceInterceptor } from './playground-device.interceptor';

const DEVICE_TOKEN = 'signedDeviceToken1234567890';
const CHAT_URL = `${environment.baseUrl}assistant/chat/execute-function`;
const CLIENT_URL = `${environment.baseUrl}Clients/1`;
const STATUS_URL = `${environment.baseUrl}Playground/Status`;
const STT_URL = `${environment.baseUrl}assistant/stt/transcribe`;
const TTS_URL = `${environment.baseUrl}assistant/tts/synthesize`;
const FOREIGN_CHAT_URLS = [
  'https://third-party.example.com/api/backend/assistant/chat/execute-function',
  '//third-party.example.com/api/backend/assistant/chat/execute-function',
];

describe('PlaygroundDeviceInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let deviceHeaders: Record<string, string>;
  let statusGate: PlaygroundStatusGateService;

  beforeEach(() => {
    deviceHeaders = {};
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: PlaygroundDeviceInterceptor, multi: true },
        { provide: PlaygroundDeviceService, useValue: { deviceHeaders: () => deviceHeaders } },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    statusGate = TestBed.inject(PlaygroundStatusGateService);
  });

  afterEach(() => httpMock.verify());

  it('adds the device header to an LLM request while the limit is active', () => {
    // Arrange
    deviceHeaders = { [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN };

    // Act
    httpClient.post(CHAT_URL, {}).subscribe();

    // Assert
    const request = httpMock.expectOne(CHAT_URL);
    expect(request.request.headers.get(PLAYGROUND_DEVICE_HEADER)).toBe(DEVICE_TOKEN);
    request.flush(null);
  });

  it('sends no header while the limit is inactive', () => {
    // Act
    httpClient.post(CHAT_URL, {}).subscribe();

    // Assert
    const request = httpMock.expectOne(CHAT_URL);
    expect(request.request.headers.has(PLAYGROUND_DEVICE_HEADER)).toBe(false);
    request.flush(null);
  });

  it('sends no header to endpoints that do not consume the LLM budget', () => {
    // Arrange
    deviceHeaders = { [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN };

    // Act
    httpClient.get(CLIENT_URL).subscribe();

    // Assert
    const request = httpMock.expectOne(CLIENT_URL);
    expect(request.request.headers.has(PLAYGROUND_DEVICE_HEADER)).toBe(false);
    request.flush(null);
  });

  it.each([STT_URL, TTS_URL])('sends no header to %s, which does not consume the LLM budget', (url) => {
    // Arrange
    deviceHeaders = { [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN };

    // Act
    httpClient.post(url, {}).subscribe();

    // Assert
    const request = httpMock.expectOne(url);
    expect(request.request.headers.has(PLAYGROUND_DEVICE_HEADER)).toBe(false);
    request.flush(null);
  });

  it.each(FOREIGN_CHAT_URLS)('never sends the device token to the foreign address %s', (url) => {
    // Arrange
    deviceHeaders = { [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN };

    // Act
    httpClient.post(url, {}).subscribe();

    // Assert
    const request = httpMock.expectOne(url);
    expect(request.request.headers.has(PLAYGROUND_DEVICE_HEADER)).toBe(false);
    request.flush(null);
  });

  it('does not hold a foreign request back while the status loads', () => {
    // Arrange
    statusGate.begin();

    // Act
    httpClient.post(FOREIGN_CHAT_URLS[0], {}).subscribe();

    // Assert
    httpMock.expectOne(FOREIGN_CHAT_URLS[0]).flush(null);
  });

  it('holds an LLM request back until the status is known and then sends it with the header', async () => {
    // Arrange
    statusGate.begin();
    httpClient.post(CHAT_URL, {}).subscribe();

    // Assert
    httpMock.expectNone(CHAT_URL);

    // Act
    deviceHeaders = { [PLAYGROUND_DEVICE_HEADER]: DEVICE_TOKEN };
    statusGate.end();
    await Promise.resolve();
    await Promise.resolve();

    // Assert
    const request = httpMock.expectOne(CHAT_URL);
    expect(request.request.headers.get(PLAYGROUND_DEVICE_HEADER)).toBe(DEVICE_TOKEN);
    request.flush(null);
  });

  it('holds an LLM request back and sends it without header when the status turned out inactive', async () => {
    // Arrange
    statusGate.begin();
    httpClient.post(CHAT_URL, {}).subscribe();

    // Act
    statusGate.end();
    await Promise.resolve();
    await Promise.resolve();

    // Assert
    const request = httpMock.expectOne(CHAT_URL);
    expect(request.request.headers.has(PLAYGROUND_DEVICE_HEADER)).toBe(false);
    request.flush(null);
  });

  it('never holds back the status request itself or other endpoints while the status loads', () => {
    // Arrange
    statusGate.begin();

    // Act
    httpClient.get(STATUS_URL).subscribe();
    httpClient.get(CLIENT_URL).subscribe();

    // Assert
    httpMock.expectOne(STATUS_URL).flush(null);
    httpMock.expectOne(CLIENT_URL).flush(null);
  });
});
