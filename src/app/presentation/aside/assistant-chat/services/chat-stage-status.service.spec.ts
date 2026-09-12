// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ChatStageStatusService } from './chat-stage-status.service';
import { ASSISTANT_STATUS_STAGE } from 'src/app/domain/constants/assistant-status-stage.constants';

describe('ChatStageStatusService', () => {
  let service: ChatStageStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatStageStatusService);
  });

  it('has no active message and the fallback label before any message starts', () => {
    expect(service.activeMessageId()).toBeNull();
    expect(service.isActiveMessage('msg-1')).toBe(false);
    expect(service.stageLabelKey()).toBe('assistant-chat.tool-status.working');
  });

  it('startMessage claims ownership and resets stage and tool steps', () => {
    service.addToolStep('search_address');
    service.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);

    service.startMessage('msg-1');

    expect(service.isActiveMessage('msg-1')).toBe(true);
    expect(service.toolSteps()).toEqual([]);
    expect(service.stageLabelKey()).toBe('assistant-chat.tool-status.working');
  });

  it('applyStatus is ignored while no message is active', () => {
    service.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);

    expect(service.stage()).toBe(ASSISTANT_STATUS_STAGE.Unknown);
  });

  it('applyStatus updates the stage label once a message is active', () => {
    service.startMessage('msg-1');

    service.applyStatus(ASSISTANT_STATUS_STAGE.AssemblingToolset);
    expect(service.stageLabelKey()).toBe('assistant-chat.stage.assembling_toolset');

    service.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);
    expect(service.stageLabelKey()).toBe('assistant-chat.stage.calling_model');
  });

  it('addToolStep appends a not-done step and markToolStepDone marks the matching one done', () => {
    service.startMessage('msg-1');

    service.addToolStep('create_employee');
    service.addToolStep('search_address');
    expect(service.toolSteps().length).toBe(2);
    expect(service.toolSteps().every((s) => !s.done)).toBe(true);

    service.markToolStepDone('search_address');
    expect(service.toolSteps().find((s) => s.functionName === 'search_address')?.done).toBe(true);
    expect(service.toolSteps().find((s) => s.functionName === 'create_employee')?.done).toBe(false);
  });

  it('markToolStepDone falls back to the first not-done step when the name does not match', () => {
    service.startMessage('msg-1');
    service.addToolStep('create_employee');

    service.markToolStepDone('unrelated_function');

    expect(service.toolSteps()[0].done).toBe(true);
  });

  it('onContentStarted clears stage and tool steps but keeps ownership of the message', () => {
    service.startMessage('msg-1');
    service.applyStatus(ASSISTANT_STATUS_STAGE.CallingModel);
    service.addToolStep('search_address');

    service.onContentStarted();

    expect(service.isActiveMessage('msg-1')).toBe(true);
    expect(service.toolSteps()).toEqual([]);
    expect(service.stageLabelKey()).toBe('assistant-chat.tool-status.working');

    // A later multi-turn tool call must still render against the same message.
    service.addToolStep('update_shift');
    expect(service.isActiveMessage('msg-1')).toBe(true);
    expect(service.toolSteps().length).toBe(1);
  });

  it('clear fully releases the message, stage and tool steps', () => {
    service.startMessage('msg-1');
    service.applyStatus(ASSISTANT_STATUS_STAGE.ExecutingTool);
    service.addToolStep('search_address');

    service.clear();

    expect(service.activeMessageId()).toBeNull();
    expect(service.isActiveMessage('msg-1')).toBe(false);
    expect(service.toolSteps()).toEqual([]);
    expect(service.stageLabelKey()).toBe('assistant-chat.tool-status.working');
  });

  it('categorizes tool step keys by function name prefix', () => {
    service.startMessage('msg-1');

    service.addToolStep('search_client');
    service.addToolStep('create_employee');
    service.addToolStep('update_shift');
    service.addToolStep('navigate_to');
    service.addToolStep('unrecognized_verb');

    const keys = service.toolSteps().map((s) => s.key);
    expect(keys).toEqual([
      'assistant-chat.tool-status.searching',
      'assistant-chat.tool-status.creating',
      'assistant-chat.tool-status.updating',
      'assistant-chat.tool-status.navigating',
      'assistant-chat.tool-status.working',
    ]);
  });
});
