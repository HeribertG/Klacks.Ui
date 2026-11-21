// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataTtsService } from './data-tts.service';
import { environment } from 'src/environments/environment';

const REQUEST = { text: 'Hallo', locale: 'de', providerId: 'local', voiceId: 'supertonic:F1' };

describe('DataTtsService.synthesize', () => {
  let service: DataTtsService;
  let httpMock: HttpTestingController;
  let url: string;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DataTtsService);
    httpMock = TestBed.inject(HttpTestingController);
    url = `${environment.baseAssistantUrl || `${environment.baseUrl}assistant/`}tts/synthesize`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns the WAV blob unchanged', async () => {
    const wav = new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'audio/wav' });
    const pending = service.synthesize(REQUEST);

    httpMock.expectOne(url).flush(wav);

    const blob = await pending;
    expect(blob).toBe(wav);
    expect(blob?.type).toBe('audio/wav');
  });

  it('returns null for 204 No Content (no audio for this language)', async () => {
    const pending = service.synthesize(REQUEST);

    httpMock.expectOne(url).flush(null, { status: 204, statusText: 'No Content' });

    expect(await pending).toBeNull();
  });

  it('returns null for 503 Service Unavailable with Retry-After', async () => {
    const pending = service.synthesize(REQUEST);

    httpMock
      .expectOne(url)
      .flush(new Blob([]), { status: 503, statusText: 'Service Unavailable', headers: { 'Retry-After': '5' } });

    expect(await pending).toBeNull();
  });

  it('returns null for an empty body', async () => {
    const pending = service.synthesize(REQUEST);

    httpMock.expectOne(url).flush(new Blob([]));

    expect(await pending).toBeNull();
  });
});
