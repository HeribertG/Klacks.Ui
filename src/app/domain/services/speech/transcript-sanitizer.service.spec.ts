// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranscriptSanitizerService } from './transcript-sanitizer.service';

describe('TranscriptSanitizerService', () => {
  let service: TranscriptSanitizerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TranscriptSanitizerService] });
    service = TestBed.inject(TranscriptSanitizerService);
  });

  it('treats empty or whitespace-only text as non-speech', () => {
    expect(service.isNonSpeech('')).toBe(true);
    expect(service.isNonSpeech('   ')).toBe(true);
  });

  it('detects asterisk-wrapped sound annotations', () => {
    expect(service.isNonSpeech('* Musik *')).toBe(true);
    expect(service.isNonSpeech('*Music*')).toBe(true);
  });

  it('detects bracket- and parenthesis-wrapped sound annotations', () => {
    expect(service.isNonSpeech('[Musik]')).toBe(true);
    expect(service.isNonSpeech('[Applause]')).toBe(true);
    expect(service.isNonSpeech('(Gelächter)')).toBe(true);
  });

  it('detects known hallucination phrases regardless of case and trailing punctuation', () => {
    expect(service.isNonSpeech('Musik')).toBe(true);
    expect(service.isNonSpeech('MUSIK.')).toBe(true);
    expect(service.isNonSpeech('Amara.org')).toBe(true);
    expect(service.isNonSpeech('Untertitel im Auftrag des ZDF')).toBe(true);
  });

  it('keeps genuine user speech', () => {
    expect(service.isNonSpeech('Zeig mir alle Customer')).toBe(false);
    expect(service.isNonSpeech('Lege einen neuen Mitarbeiter an')).toBe(false);
  });

  it('does not flag speech that merely contains a non-speech word', () => {
    expect(service.isNonSpeech('Spiel etwas Musik ab')).toBe(false);
    expect(service.isNonSpeech('Die Gruppe Musik anzeigen')).toBe(false);
  });
});
