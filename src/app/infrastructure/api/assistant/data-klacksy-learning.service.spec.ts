// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataKlacksyLearningService } from './data-klacksy-learning.service';
import {
  ILearnedCapability,
  ILearnedPhrase,
  IUnfulfillableWish,
} from 'src/app/domain/interfaces/klacksy-learning.interface';
import { environment } from 'src/environments/environment';

describe('DataKlacksyLearningService', () => {
  let service: DataKlacksyLearningService;
  let httpMock: HttpTestingController;
  let apiUrl: string;
  let assistantUrl: string;

  const mockPhrases: ILearnedPhrase[] = [
    {
      id: 'phrase-1',
      skillName: 'search_employees',
      language: 'de',
      phrase: 'wer arbeitet heute',
      learnedAt: '2026-08-28T06:00:00Z',
      quote: 0.83,
      uses: 12,
      source: 'learned',
    },
    {
      id: 'proposal-1',
      skillName: 'list_absences',
      language: 'und',
      phrase: 'Lists absences of a single employee.',
      learnedAt: '2026-08-27T06:00:00Z',
      quote: null,
      uses: null,
      source: 'description',
    },
  ];

  const mockCapabilities: ILearnedCapability[] = [
    {
      id: 'capability-1',
      name: 'weekly_absence_digest',
      goal: 'Summarise the absences of the current week',
      steps: [
        { skill: 'get_current_time', kind: 'search' },
        { skill: 'list_absences', kind: 'search' },
      ],
      learnedAt: '2026-08-28T06:00:00Z',
      quote: null,
      uses: null,
      needsFirstUse: true,
    },
  ];

  const mockWishes: IUnfulfillableWish[] = [
    {
      id: 'cluster-1',
      intentExcerpt: 'Schick mir das als Fax',
      locale: 'de',
      occurrenceCount: 5,
      distinctUserCount: 3,
      firstSeen: '2026-08-20T06:00:00Z',
      lastSeen: '2026-08-27T06:00:00Z',
      lastError: null,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataKlacksyLearningService],
    });
    service = TestBed.inject(DataKlacksyLearningService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}learning`;
    assistantUrl = `${environment.baseAssistantUrl}`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getPhrases gets learning/phrases with the limit param', () => {
    service.getPhrases(50).subscribe((entries) => {
      expect(entries).toEqual(mockPhrases);
    });

    const req = httpMock.expectOne(
      (candidate) => candidate.url === `${apiUrl}/phrases` && candidate.params.get('limit') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockPhrases);
  });

  it('updatePhrase puts the phrase body to learning/phrases/{id}', () => {
    service.updatePhrase('phrase-1', { phrase: 'wer hat heute Dienst' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/phrases/phrase-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ phrase: 'wer hat heute Dienst' });
    req.flush(null);
  });

  it('updatePhrase puts the description body for a description sharpening', () => {
    service.updatePhrase('proposal-1', { description: 'Lists absences.' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/phrases/proposal-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ description: 'Lists absences.' });
    req.flush(null);
  });

  it('deletePhrase deletes learning/phrases/{id}', () => {
    service.deletePhrase('phrase-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/phrases/phrase-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('approveDescriptionProposal posts to skill-proposals/{id}/approve', () => {
    const response = { applied: true, error: null, newSkillVersion: 4 };
    let received: unknown = null;
    service.approveDescriptionProposal('proposal-1').subscribe((result) => {
      received = result;
    });

    const req = httpMock.expectOne(`${assistantUrl}skill-proposals/proposal-1/approve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(response);

    expect(received).toEqual(response);
  });

  it('approveDescriptionProposal does not retry and surfaces the 400 of an unapprovable proposal', () => {
    let status = 0;
    service.approveDescriptionProposal('proposal-1').subscribe({
      next: () => {
        throw new Error('should not emit');
      },
      error: (error) => {
        status = error.status;
      },
    });

    const req = httpMock.expectOne(`${assistantUrl}skill-proposals/proposal-1/approve`);
    req.flush({ error: 'Proposal is in status applied_auto, cannot approve.' }, {
      status: 400,
      statusText: 'Bad Request',
    });

    expect(status).toBe(400);
    httpMock.expectNone(`${assistantUrl}skill-proposals/proposal-1/approve`);
  });

  it('getCapabilities gets learning/capabilities', () => {
    service.getCapabilities().subscribe((entries) => {
      expect(entries).toEqual(mockCapabilities);
    });

    const req = httpMock.expectOne(`${apiUrl}/capabilities`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCapabilities);
  });

  it('updateCapability puts the goal to learning/capabilities/{id}', () => {
    service.updateCapability('capability-1', { goal: 'Summarise this week' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/capabilities/capability-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ goal: 'Summarise this week' });
    req.flush(null);
  });

  it('deleteCapability deletes learning/capabilities/{id}', () => {
    service.deleteCapability('capability-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/capabilities/capability-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getUnfulfillableWishes gets learning/unfulfillable', () => {
    service.getUnfulfillableWishes().subscribe((entries) => {
      expect(entries).toEqual(mockWishes);
    });

    const req = httpMock.expectOne(`${apiUrl}/unfulfillable`);
    expect(req.request.method).toBe('GET');
    req.flush(mockWishes);
  });

  it('dismissUnfulfillableWish deletes learning/unfulfillable/{id}', () => {
    service.dismissUnfulfillableWish('cluster-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/unfulfillable/cluster-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
