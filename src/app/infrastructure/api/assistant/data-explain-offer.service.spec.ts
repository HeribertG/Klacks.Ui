// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataExplainOfferService } from './data-explain-offer.service';
import { environment } from 'src/environments/environment';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { EXPLAIN_OFFER_OUTCOME, EXPLAIN_OFFER_TOPIC, EXPLAIN_OFFERS_PATH } from 'src/app/domain/constants/explain-offer.constants';

describe('DataExplainOfferService', () => {
  let service: DataExplainOfferService;
  let httpMock: HttpTestingController;
  const topicUrl = `${environment.baseAssistantUrl}explain-offers/${EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataExplainOfferService],
    });
    service = TestBed.inject(DataExplainOfferService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('reads the state of a topic without a user id and without the spinner', () => {
    service.getState(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions).subscribe();

    const request = httpMock.expectOne(topicUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SKIP_LOADING)).toBe(true);
    expect(request.request.url).toContain(EXPLAIN_OFFERS_PATH);
    request.flush({ topicKey: EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, shouldOffer: true });
  });

  it('posts only the outcome of a reaction', () => {
    service.recordReaction(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, EXPLAIN_OFFER_OUTCOME.Accepted).subscribe();

    const request = httpMock.expectOne(`${topicUrl}/reaction`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ outcome: EXPLAIN_OFFER_OUTCOME.Accepted });
    request.flush(null);
  });
});
