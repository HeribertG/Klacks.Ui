// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';
import { ChatTurnControlService } from 'src/app/presentation/aside/assistant-chat/services/chat-turn-control.service';

describe('AssistantTurnLauncherService', () => {
  let service: AssistantTurnLauncherService;
  let show: ReturnType<typeof vi.fn>;
  let submitText: ReturnType<typeof vi.fn>;
  let hasDraft: ReturnType<typeof vi.fn>;
  let asideVisible: ReturnType<typeof signal<boolean>>;
  let turnRunning: ReturnType<typeof signal<boolean>>;
  let turnStopping: ReturnType<typeof signal<boolean>>;

  const flushMountDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    asideVisible = signal(false);
    turnRunning = signal(false);
    turnStopping = signal(false);
    show = vi.fn(() => asideVisible.set(true));
    submitText = vi.fn().mockResolvedValue(undefined);
    hasDraft = vi.fn(() => false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AsideService, useValue: { show, isVisible: asideVisible } },
        { provide: ConversationOrchestratorService, useValue: { submitText, hasDraft } },
        { provide: ChatTurnControlService, useValue: { isTurnRunning: turnRunning, isStopping: turnStopping } },
      ],
    });
    service = TestBed.inject(AssistantTurnLauncherService);
  });

  it('opens the panel at once and sends the text after the chat has mounted', async () => {
    service.openAndAsk('Why can Anna not work?');

    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).not.toHaveBeenCalled();
    await flushMountDelay();
    expect(submitText).toHaveBeenCalledWith('Why can Anna not work?');
  });

  it('does nothing for blank text', async () => {
    service.openAndAsk('   ');

    await flushMountDelay();
    expect(show).not.toHaveBeenCalled();
    expect(submitText).not.toHaveBeenCalled();
  });

  it.each([
    { state: 'running', setBusy: () => turnRunning.set(true) },
    { state: 'stopping', setBusy: () => turnStopping.set(true) },
  ])('only shows the panel while a turn is $state, so the turn is not superseded', async ({ setBusy }) => {
    setBusy();

    service.openAndAsk('Why can Anna not work?');

    await flushMountDelay();
    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).not.toHaveBeenCalled();
  });

  it('only shows the panel while the open chat holds a draft, so the draft is not overwritten', async () => {
    asideVisible.set(true);
    hasDraft.mockReturnValue(true);

    service.openAndAsk('Why can Anna not work?');

    await flushMountDelay();
    expect(show).toHaveBeenCalledTimes(1);
    expect(submitText).not.toHaveBeenCalled();
  });

  it('ignores the leftover draft of a closed panel, whose chat is destroyed', async () => {
    hasDraft.mockReturnValue(true);

    service.openAndAsk('Why can Anna not work?');

    await flushMountDelay();
    expect(submitText).toHaveBeenCalledWith('Why can Anna not work?');
  });
});
