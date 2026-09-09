// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the honest navigation feedback (W0): a navigation that fell short must correct the
 * prose the model already streamed, must never claim more than happened, and must be counted.
 */
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import {
  NAVIGATION_OUTCOME_PERMISSION_DENIED,
  NAVIGATION_OUTCOME_SCROLLED,
  NAVIGATION_OUTCOME_TARGET_MISS,
  NAVIGATION_REASON_PERMISSION_DENIED,
  NAVIGATION_REASON_TARGET_NOT_FOUND,
  NAV_CORRECTION_PERMISSION_DENIED_KEY,
  NAV_CORRECTION_TARGET_NOT_FOUND_KEY,
} from 'src/app/domain/constants/navigation-outcome.constants';
import { ChatMessage } from '../chat-message.interface';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { NavigationVerdictService } from './navigation-verdict.service';

const MESSAGE_ID = 'msg_1';
const STREAMED_PROSE = 'Ich habe dir die Einstellungen geöffnet.';
const CORRECTION_TEXT = 'Die Stelle finde ich gerade nicht.';
const PERMISSION_TEXT = 'Für diesen Bereich hast du keine Berechtigung.';
const ROUTE = '/workplace/settings';
const TARGET = 'erp-drop-points';
const UTTERANCE = 'zeige mir die uploadfläche';

describe('NavigationVerdictService', () => {
  let service: NavigationVerdictService;
  let messages: ChatMessage[];
  let orchestrator: {
    messages: ReturnType<typeof vi.fn>;
    updateMessage: ReturnType<typeof vi.fn>;
    speakFollowUpSentence: ReturnType<typeof vi.fn>;
  };
  let assistantService: { reportNavigationOutcome: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    messages = [
      {
        id: MESSAGE_ID,
        sender: 'assistant',
        content: STREAMED_PROSE,
        timestamp: new Date(),
      },
    ];
    orchestrator = {
      messages: vi.fn(() => messages),
      updateMessage: vi.fn(),
      speakFollowUpSentence: vi.fn(),
    };
    assistantService = {
      reportNavigationOutcome: vi.fn(() => of({ recorded: true })),
    };

    TestBed.configureTestingModule({
      providers: [
        NavigationVerdictService,
        { provide: ConversationOrchestratorService, useValue: orchestrator },
        { provide: DataManagementAssistantService, useValue: assistantService },
        {
          provide: TranslateService,
          useValue: {
            currentLang: 'de',
            instant: (key: string) =>
              key === NAV_CORRECTION_TARGET_NOT_FOUND_KEY
                ? CORRECTION_TEXT
                : key === NAV_CORRECTION_PERMISSION_DENIED_KEY
                  ? PERMISSION_TEXT
                  : key,
          },
        },
      ],
    });
    service = TestBed.inject(NavigationVerdictService);
  });

  it('appends the correction even when the assistant message already carries streamed prose', () => {
    service.apply(
      MESSAGE_ID,
      { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND },
      ROUTE,
      TARGET,
      UTTERANCE,
    );

    expect(orchestrator.updateMessage).toHaveBeenCalledTimes(1);
    const update = orchestrator.updateMessage.mock.calls[0][1];
    expect(update.content).toContain(STREAMED_PROSE);
    expect(update.content).toContain(CORRECTION_TEXT);
    expect(update.formattedContent).toBeTruthy();
  });

  it('never puts the raw reason string in front of the user', () => {
    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    const update = orchestrator.updateMessage.mock.calls[0][1];
    expect(update.content).not.toContain(NAVIGATION_REASON_TARGET_NOT_FOUND);
  });

  it('uses the permission wording when a guard refused the navigation', () => {
    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_PERMISSION_DENIED }, ROUTE, TARGET);

    const update = orchestrator.updateMessage.mock.calls[0][1];
    expect(update.content).toContain(PERMISSION_TEXT);
    expect(update.content).not.toContain(CORRECTION_TEXT);
  });

  it('stays silent when the browser never navigated at all', () => {
    service.apply(MESSAGE_ID, { success: false }, ROUTE, TARGET);

    expect(orchestrator.updateMessage).not.toHaveBeenCalled();
    expect(assistantService.reportNavigationOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: NAVIGATION_OUTCOME_PERMISSION_DENIED }),
    );
  });

  it('attaches the correction to the message id it was given, not to a newer one', () => {
    messages.push({
      id: 'msg_proactive',
      sender: 'assistant',
      content: 'Eine Schicht ist unbesetzt.',
      timestamp: new Date(),
      messageKind: 'proactive',
    });

    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    expect(orchestrator.updateMessage.mock.calls[0][0]).toBe(MESSAGE_ID);
  });

  it('reports a scroll that worked, so the miss rate has a denominator', () => {
    service.apply(MESSAGE_ID, { success: true }, ROUTE, TARGET, UTTERANCE);

    expect(assistantService.reportNavigationOutcome).toHaveBeenCalledWith({
      route: ROUTE,
      target: TARGET,
      outcome: NAVIGATION_OUTCOME_SCROLLED,
      locale: 'de',
      utterance: UTTERANCE,
    });
    expect(orchestrator.updateMessage).not.toHaveBeenCalled();
  });

  it('reports a miss as target-miss', () => {
    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    expect(assistantService.reportNavigationOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: NAVIGATION_OUTCOME_TARGET_MISS }),
    );
  });

  it('does not report a plain page navigation that carried no target', () => {
    service.apply(MESSAGE_ID, { success: true }, ROUTE, undefined, UTTERANCE);

    expect(assistantService.reportNavigationOutcome).not.toHaveBeenCalled();
  });

  it('reports without touching the message when it is not the last navigation of the turn', () => {
    service.report({ success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    expect(assistantService.reportNavigationOutcome).toHaveBeenCalled();
    expect(orchestrator.updateMessage).not.toHaveBeenCalled();
  });

  it('swallows a failing report so it can never cost the user their answer', () => {
    assistantService.reportNavigationOutcome.mockReturnValue(throwError(() => new Error('offline')));

    expect(() =>
      service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET),
    ).not.toThrow();
    expect(orchestrator.updateMessage).toHaveBeenCalled();
  });

  it('speaks the correction itself, because the stream was read out before the verdict existed', () => {
    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    expect(orchestrator.speakFollowUpSentence).toHaveBeenCalledWith(CORRECTION_TEXT);
  });

  it('announces an appended correction so the chat can scroll it into view', () => {
    const seen: number[] = [];
    service.correctionAppended$.subscribe(() => seen.push(1));

    service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET);

    expect(seen).toHaveLength(1);
  });

  it('appends the correction for a server-detected suspected miss without reporting it again', () => {
    service.applySuspectedMiss(MESSAGE_ID);

    expect(orchestrator.updateMessage.mock.calls[0][1].content).toContain(CORRECTION_TEXT);
    expect(assistantService.reportNavigationOutcome).not.toHaveBeenCalled();
  });

  it('does not append the same correction twice', () => {
    messages[0].content = `${STREAMED_PROSE}\n\n${CORRECTION_TEXT}`;

    service.applySuspectedMiss(MESSAGE_ID);

    expect(orchestrator.updateMessage).not.toHaveBeenCalled();
  });

  it('does not throw when the message is gone by the time the verdict arrives', () => {
    messages.length = 0;

    expect(() =>
      service.apply(MESSAGE_ID, { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND }, ROUTE, TARGET),
    ).not.toThrow();
    expect(assistantService.reportNavigationOutcome).toHaveBeenCalled();
  });
});
