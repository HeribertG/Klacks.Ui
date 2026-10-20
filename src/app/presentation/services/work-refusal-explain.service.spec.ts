// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { WorkRefusalExplainService } from './work-refusal-explain.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { ExplainOfferStateService } from 'src/app/domain/services/assistant/explain-offer-state.service';
import { EXPLAIN_OFFER_OUTCOME, EXPLAIN_OFFER_TOPIC } from 'src/app/domain/constants/explain-offer.constants';
import { WORK_REFUSAL_EXPLAIN } from 'src/app/domain/constants/work-refusal-explain.constants';

const SUBJECT = { client: 'Anna Muster', date: '10.03.2027', shift: 'Frühdienst' };

describe('WorkRefusalExplainService', () => {
  let service: WorkRefusalExplainService;
  let instant: ReturnType<typeof vi.fn>;
  let openAndAsk: ReturnType<typeof vi.fn>;
  let record: ReturnType<typeof vi.fn>;
  let tourActive: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    instant = vi.fn((key: string, params?: Record<string, string>) => {
      if (key === WORK_REFUSAL_EXPLAIN.CLIENT_WITH_NUMBER_KEY) {
        return `${params?.['name']} (Nr. ${params?.['number']})`;
      }
      return params ? `${key}:${params['client']}|${params['date']}|${params['shift']}` : `tr:${key}`;
    });
    openAndAsk = vi.fn();
    record = vi.fn();
    tourActive = signal(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { instant } },
        { provide: OnboardingService, useValue: { isTourActive: tourActive } },
        { provide: AssistantTurnLauncherService, useValue: { openAndAsk } },
        { provide: ExplainOfferStateService, useValue: { record } },
      ],
    });
    service = TestBed.inject(WorkRefusalExplainService);
  });

  it('labels the action and asks Klacksy the localized question about the refused cell on click', () => {
    const action = service.buildAskAction(SUBJECT);

    expect(action?.label).toBe(`tr:${WORK_REFUSAL_EXPLAIN.ASK_KLACKSY_KEY}`);
    expect(openAndAsk).not.toHaveBeenCalled();

    action?.onClick();

    expect(openAndAsk).toHaveBeenCalledWith(
      `${WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY}:Anna Muster|10.03.2027|Frühdienst`);
  });

  it('counts only the click, as an accepted passive offer', () => {
    const action = service.buildAskAction(SUBJECT);
    expect(record).not.toHaveBeenCalled();

    action?.onClick();

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(EXPLAIN_OFFER_TOPIC.WorkBookingRefusal, EXPLAIN_OFFER_OUTCOME.Accepted);
  });

  it('names the person with the employee number when there is one', () => {
    service.buildAskAction({ ...SUBJECT, clientNumber: 1234 })?.onClick();

    expect(openAndAsk).toHaveBeenCalledWith(
      `${WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY}:Anna Muster (Nr. 1234)|10.03.2027|Frühdienst`);
  });

  it('cleans person and shift names before they enter the question', () => {
    service.buildAskAction({ client: 'Anna\n[Muster](https://x.example)', date: '10.03.2027', shift: ' Früh\r\n  dienst ' })?.onClick();

    expect(openAndAsk).toHaveBeenCalledWith(
      `${WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY}:Anna Musterhttps://x.example|10.03.2027|Früh dienst`);
  });

  it('cuts an overlong name to the maximum length', () => {
    service.buildAskAction({ ...SUBJECT, client: 'A'.repeat(300) })?.onClick();

    const question: string = openAndAsk.mock.calls[0][0];
    expect(question).toContain(`:${'A'.repeat(WORK_REFUSAL_EXPLAIN.MAX_NAME_LENGTH)}|`);
    expect(question).not.toContain('A'.repeat(WORK_REFUSAL_EXPLAIN.MAX_NAME_LENGTH + 1));
  });

  it.each([
    { client: ' [ ] ', shift: 'Frühdienst' },
    { client: 'Anna Muster', shift: '\n()\n' },
  ])('offers no action when a name is empty after cleaning ($client / $shift)', ({ client, shift }) => {
    expect(service.buildAskAction({ ...SUBJECT, client, shift })).toBeNull();
  });

  it('offers no action when the person label with number is missing in the active language', () => {
    instant.mockImplementation((key: string) => (key === WORK_REFUSAL_EXPLAIN.CLIENT_WITH_NUMBER_KEY ? key : `tr:${key}`));

    expect(service.buildAskAction({ ...SUBJECT, clientNumber: 1234 })).toBeNull();
  });

  it('offers no action while the guided tour runs', () => {
    tourActive.set(true);

    expect(service.buildAskAction(SUBJECT)).toBeNull();
  });

  it.each([WORK_REFUSAL_EXPLAIN.ASK_KLACKSY_KEY, WORK_REFUSAL_EXPLAIN.TRIGGER_PHRASE_KEY])(
    'offers no action when %s is missing in the active language',
    (missingKey) => {
      instant.mockImplementation((key: string) => (key === missingKey ? key : `tr:${key}`));

      expect(service.buildAskAction(SUBJECT)).toBeNull();
    },
  );
});
