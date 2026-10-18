// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ExplainOfferStateService } from './explain-offer-state.service';
import { DataExplainOfferService } from 'src/app/infrastructure/api/assistant/data-explain-offer.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { EXPLAIN_OFFER_OUTCOME, EXPLAIN_OFFER_TOPIC } from 'src/app/domain/constants/explain-offer.constants';

const TOPIC = EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions;

describe('ExplainOfferStateService', () => {
  let service: ExplainOfferStateService;
  let getState: ReturnType<typeof vi.fn>;
  let recordReaction: ReturnType<typeof vi.fn>;
  let userId: string | null;

  beforeEach(() => {
    userId = 'user-a';
    getState = vi.fn().mockReturnValue(of({ topicKey: TOPIC, shouldOffer: true }));
    recordReaction = vi.fn().mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        ExplainOfferStateService,
        { provide: DataExplainOfferService, useValue: { getState, recordReaction } },
        { provide: LocalStorageService, useValue: { get: () => userId } },
      ],
    });
    service = TestBed.inject(ExplainOfferStateService);
  });

  it('asks the backend once per user and topic and keeps the answer for the session', async () => {
    expect(await service.shouldOffer(TOPIC)).toBe(true);
    expect(await service.shouldOffer(TOPIC)).toBe(true);

    expect(getState).toHaveBeenCalledTimes(1);
    expect(getState).toHaveBeenCalledWith(TOPIC);
  });

  it('asks again for another signed-in user', async () => {
    await service.shouldOffer(TOPIC);
    userId = 'user-b';

    await service.shouldOffer(TOPIC);

    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('is fail-closed on a failing or old backend', async () => {
    getState.mockReturnValue(throwError(() => ({ status: 404 })));

    expect(await service.shouldOffer(TOPIC)).toBe(false);
  });

  it('does not keep a failed read, so the next trigger asks again', async () => {
    getState.mockReturnValueOnce(throwError(() => ({ status: 500 })));

    expect(await service.shouldOffer(TOPIC)).toBe(false);
    expect(await service.shouldOffer(TOPIC)).toBe(true);

    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('a read failing after a recorded reaction keeps the topic closed', async () => {
    const pending = new Subject<never>();
    getState.mockReturnValueOnce(pending.asObservable());

    const first = service.shouldOffer(TOPIC);
    service.record(TOPIC, EXPLAIN_OFFER_OUTCOME.Later);
    pending.error({ status: 500 });

    expect(await first).toBe(false);
    expect(await service.shouldOffer(TOPIC)).toBe(false);
    expect(getState).toHaveBeenCalledTimes(1);
  });

  it('follows the backend answer', async () => {
    getState.mockReturnValue(of({ topicKey: TOPIC, shouldOffer: false }));

    expect(await service.shouldOffer(TOPIC)).toBe(false);
  });

  it('offers nothing and calls nothing without a signed-in user', async () => {
    userId = null;

    expect(await service.shouldOffer(TOPIC)).toBe(false);
    service.record(TOPIC, EXPLAIN_OFFER_OUTCOME.Shown);

    expect(getState).not.toHaveBeenCalled();
    expect(recordReaction).not.toHaveBeenCalled();
  });

  it('a recorded reaction is sent and closes the topic for the session', async () => {
    service.record(TOPIC, EXPLAIN_OFFER_OUTCOME.Later);

    expect(recordReaction).toHaveBeenCalledWith(TOPIC, EXPLAIN_OFFER_OUTCOME.Later);
    expect(await service.shouldOffer(TOPIC)).toBe(false);
    expect(getState).not.toHaveBeenCalled();
  });

  it('swallows a failing reaction write', () => {
    recordReaction.mockReturnValue(throwError(() => new Error('offline')));

    expect(() => service.record(TOPIC, EXPLAIN_OFFER_OUTCOME.Declined)).not.toThrow();
  });
});
