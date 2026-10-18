// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ConversationOrchestratorService } from 'src/app/presentation/aside/assistant-chat/services/conversation-orchestrator.service';

describe('AssistantTurnLauncherService', () => {
  let service: AssistantTurnLauncherService;
  let show: ReturnType<typeof vi.fn>;
  let submitText: ReturnType<typeof vi.fn>;

  const flushMountDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    show = vi.fn();
    submitText = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: AsideService, useValue: { show } },
        { provide: ConversationOrchestratorService, useValue: { submitText } },
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
});
