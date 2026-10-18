// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HolidayOptionExplainOfferService } from './holiday-option-explain-offer.service';
import { OnboardingService } from './onboarding.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ExplainOfferStateService } from 'src/app/domain/services/assistant/explain-offer-state.service';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import {
  EXPLAIN_OFFER_OUTCOME,
  EXPLAIN_OFFER_TOPIC,
  HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS,
} from 'src/app/domain/constants/explain-offer.constants';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('HolidayOptionExplainOfferService', () => {
  let service: HolidayOptionExplainOfferService;
  let showInteractiveReply: ReturnType<typeof vi.fn>;
  let hasOpenInteractiveReply: ReturnType<typeof vi.fn>;
  let submitText: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;
  let record: ReturnType<typeof vi.fn>;
  let shouldOffer: ReturnType<typeof vi.fn>;
  let currentUserId: ReturnType<typeof vi.fn>;
  let instant: ReturnType<typeof vi.fn>;
  let tourActive: ReturnType<typeof signal<boolean>>;

  const flushMountDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    showInteractiveReply = vi.fn();
    hasOpenInteractiveReply = vi.fn().mockReturnValue(false);
    submitText = vi.fn().mockResolvedValue(undefined);
    show = vi.fn();
    record = vi.fn();
    shouldOffer = vi.fn().mockResolvedValue(true);
    currentUserId = vi.fn().mockReturnValue(USER_A);
    instant = vi.fn((key: string) => 'tr:' + key);
    tourActive = signal(false);
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        HolidayOptionExplainOfferService,
        { provide: ToastShowService, useValue: { showInteractiveReply, hasOpenInteractiveReply } },
        { provide: ConversationOrchestratorService, useValue: { submitText } },
        { provide: AsideService, useValue: { show } },
        { provide: OnboardingService, useValue: { isTourActive: tourActive } },
        { provide: ExplainOfferStateService, useValue: { shouldOffer, record, currentUserId } },
        { provide: TranslateService, useValue: { instant } },
      ],
    });
    service = TestBed.inject(HolidayOptionExplainOfferService);
  });

  function capturedConfig(): ISuggestedRepliesConfig {
    return showInteractiveReply.mock.calls[0][0];
  }

  function choose(value: string): void {
    const onSelected: (values: string[]) => void = showInteractiveReply.mock.calls[0][1];
    onSelected([value]);
  }

  it('offers once with three chips (yes, later, no) in the active language and records "shown"', async () => {
    await service.offerOnce();

    expect(shouldOffer).toHaveBeenCalledWith(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions);
    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
    const config = capturedConfig();
    expect(config.selectionMode).toBe('single');
    expect(config.prompt).toBe('tr:' + HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.prompt);
    expect(config.options).toEqual([
      { label: 'tr:' + HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.accept, value: EXPLAIN_OFFER_OUTCOME.Accepted },
      { label: 'tr:' + HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.later, value: EXPLAIN_OFFER_OUTCOME.Later },
      { label: 'tr:' + HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.decline, value: EXPLAIN_OFFER_OUTCOME.Declined },
    ]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, EXPLAIN_OFFER_OUTCOME.Shown);
  });

  it('appears exactly once per session, also after several ticks', async () => {
    await service.offerOnce();
    await service.offerOnce();
    await service.offerOnce();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('two ticks in quick succession still show one offer', async () => {
    await Promise.all([service.offerOnce(), service.offerOnce()]);

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('keeps the session gate per signed-in user (shared office PC)', async () => {
    await service.offerOnce();
    currentUserId.mockReturnValue(USER_B);

    await service.offerOnce();

    expect(showInteractiveReply).toHaveBeenCalledTimes(2);
  });

  it('yes records "accepted", opens Klacksy and sends the trigger phrase as a user turn', async () => {
    await service.offerOnce();

    choose(EXPLAIN_OFFER_OUTCOME.Accepted);
    await flushMountDelay();

    expect(record).toHaveBeenLastCalledWith(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, EXPLAIN_OFFER_OUTCOME.Accepted);
    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).toHaveBeenCalledTimes(1);
    expect(submitText).toHaveBeenCalledWith('tr:' + HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.triggerPhrase);
  });

  it('later records "later" and opens no chat', async () => {
    await service.offerOnce();

    choose(EXPLAIN_OFFER_OUTCOME.Later);
    await flushMountDelay();

    expect(record).toHaveBeenLastCalledWith(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, EXPLAIN_OFFER_OUTCOME.Later);
    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });

  it('no records "declined" and opens no chat', async () => {
    await service.offerOnce();

    choose(EXPLAIN_OFFER_OUTCOME.Declined);
    await flushMountDelay();

    expect(record).toHaveBeenLastCalledWith(EXPLAIN_OFFER_TOPIC.ShiftHolidayOptions, EXPLAIN_OFFER_OUTCOME.Declined);
    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });

  it('a toast closed without a choice sends nothing', async () => {
    await service.offerOnce();

    const onDismissed: (() => void) | undefined = showInteractiveReply.mock.calls[0][2];
    onDismissed?.();
    await flushMountDelay();

    expect(record).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });

  it('an unknown chip value records nothing', async () => {
    await service.offerOnce();

    choose('something-else');

    expect(record).toHaveBeenCalledTimes(1);
    expect(submitText).not.toHaveBeenCalled();
  });

  it('the backend says no (advanced user, muted account or switch off): nothing is shown or recorded', async () => {
    shouldOffer.mockResolvedValue(false);

    await service.offerOnce();

    expect(showInteractiveReply).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('stays silent while the guided tour runs', async () => {
    tourActive.set(true);

    await service.offerOnce();

    expect(shouldOffer).not.toHaveBeenCalled();
    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('waits while another interactive toast is open, without spending the session', async () => {
    hasOpenInteractiveReply.mockReturnValue(true);
    await service.offerOnce();
    expect(showInteractiveReply).not.toHaveBeenCalled();

    hasOpenInteractiveReply.mockReturnValue(false);
    await service.offerOnce();

    expect(showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('stays silent without a signed-in user', async () => {
    currentUserId.mockReturnValue(null);

    await service.offerOnce();

    expect(shouldOffer).not.toHaveBeenCalled();
    expect(showInteractiveReply).not.toHaveBeenCalled();
  });

  it('never sends a raw key: a text missing in the active language suppresses the offer', async () => {
    instant.mockImplementation((key: string) =>
      key === HOLIDAY_OPTIONS_EXPLAIN_OFFER_KEYS.triggerPhrase ? key : 'tr:' + key,
    );

    await service.offerOnce();

    expect(showInteractiveReply).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
