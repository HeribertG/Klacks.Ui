// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { AssistantFunctionExecutionService } from './assistant-function-execution.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { DataManagementAssistantService } from 'src/app/domain/services/assistant/data-management-assistant.service';
import { IAssistantFunctionCall } from 'src/app/domain/interfaces/assistant-function-definitions.interface';

describe('AssistantFunctionExecutionService', () => {
  let service: AssistantFunctionExecutionService;
  let navigateAndScroll: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateAndScroll = vi.fn();
    httpPost = vi.fn().mockReturnValue(of({ success: true }));

    TestBed.configureTestingModule({
      providers: [
        AssistantFunctionExecutionService,
        { provide: HttpClient, useValue: { post: httpPost } },
        { provide: Router, useValue: {} },
        { provide: KlacksyNavigationService, useValue: { navigateAndScroll } },
        { provide: DataManagementAssistantService, useValue: { currentLanguage: () => 'zh-TW' } },
      ],
    });

    service = TestBed.inject(AssistantFunctionExecutionService);
  });

  function navigateCall(target: string): IAssistantFunctionCall {
    return { id: 'call-1', name: 'navigate_to', arguments: { page: 'settings', target } };
  }

  it('reports success only when the target was actually found and scrolled to', async () => {
    navigateAndScroll.mockResolvedValue({ success: true });

    const result = await firstValueFrom(service.executeFunction(navigateCall('reports')));

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('reports failure instead of a blind success when the target is never found', async () => {
    navigateAndScroll.mockResolvedValue({ success: false, reason: 'target-not-found' });

    const result = await firstValueFrom(service.executeFunction(navigateCall('reports')));

    expect(result.success).toBe(false);
    expect(result.error).toBe('target-not-found');
  });

  it('sends the current app language when executing a single backend function', async () => {
    const call: IAssistantFunctionCall = { id: 'call-2', name: 'someBackendSkill', arguments: {} };

    await firstValueFrom(service.executeFunction(call));

    expect(httpPost).toHaveBeenCalledWith(
      expect.stringContaining('execute-function'),
      expect.objectContaining({ functionName: 'someBackendSkill', language: 'zh-TW' })
    );
  });

  it('sends the current app language for every request in a batch execution', async () => {
    httpPost.mockReturnValue(of([{ success: true }]));
    const call: IAssistantFunctionCall = { id: 'call-3', name: 'anotherBackendSkill', arguments: {} };

    await service.executeFunctionsBatch([call]);

    expect(httpPost).toHaveBeenCalledWith(
      expect.stringContaining('execute-functions-batch'),
      [expect.objectContaining({ functionName: 'anotherBackendSkill', language: 'zh-TW' })]
    );
  });
});
