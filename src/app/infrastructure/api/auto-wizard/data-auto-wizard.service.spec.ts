// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from '@ngx-translate/core';
import * as signalR from '@microsoft/signalr';
import {
  AutoWizardResult,
  AutoWizardStartRequest,
  DataAutoWizardService,
} from './data-auto-wizard.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import { AUTO_WIZARD_LIMITS } from './auto-wizard-limits.constants';

class FakeConnection {
  state = 'Disconnected';
  startCalls = 0;
  stopCalls = 0;
  readonly sendCalls: { method: string; args: unknown[] }[] = [];
  private readonly handlers = new Map<string, (...args: unknown[]) => void>();
  private readonly reconnectedCallbacks: (() => unknown)[] = [];
  private readonly closeCallbacks: ((error?: Error) => void)[] = [];

  async start(): Promise<void> {
    this.startCalls++;
    this.state = 'Connected';
  }

  async stop(): Promise<void> {
    this.stopCalls++;
    this.state = 'Disconnected';
  }

  async send(method: string, ...args: unknown[]): Promise<void> {
    this.sendCalls.push({ method, args });
  }

  on(name: string, callback: (...args: unknown[]) => void): void {
    this.handlers.set(name, callback);
  }

  onreconnected(callback: () => unknown): void {
    this.reconnectedCallbacks.push(callback);
  }

  onclose(callback: (error?: Error) => void): void {
    this.closeCallbacks.push(callback);
  }

  emit(name: string, ...args: unknown[]): void {
    this.handlers.get(name)?.(...args);
  }

  async fireReconnected(): Promise<void> {
    for (const callback of this.reconnectedCallbacks) {
      await callback();
    }
  }

  fireClose(): void {
    for (const callback of this.closeCallbacks) {
      callback();
    }
  }
}

const connections: FakeConnection[] = [];

class FakeBuilder {
  withUrl(): this {
    return this;
  }

  withAutomaticReconnect(): this {
    return this;
  }

  configureLogging(): this {
    return this;
  }

  build(): FakeConnection {
    const connection = new FakeConnection();
    connections.push(connection);
    return connection;
  }
}

const REQUEST: AutoWizardStartRequest = {
  periodFrom: '2026-04-01',
  periodUntil: '2026-04-30',
  agentIds: ['agent-1'],
  shiftIds: ['shift-1'],
  groupId: null,
  analyseToken: null,
  language: 'en',
  agentOrderIsUserDefined: false,
};

function makeResult(jobId: string): AutoWizardResult {
  return {
    jobId,
    finalScenarioId: 'scenario-1',
    finalScenarioToken: 'token-1',
    finalScenarioName: 'Scenario 1',
    elapsedMs: 1000,
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('DataAutoWizardService', () => {
  let service: DataAutoWizardService;
  let httpMock: HttpTestingController;
  let originalBuilder: typeof signalR.HubConnectionBuilder;

  beforeEach(() => {
    connections.length = 0;
    originalBuilder = signalR.HubConnectionBuilder;
    Object.defineProperty(signalR, 'HubConnectionBuilder', {
      configurable: true,
      writable: true,
      value: FakeBuilder,
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalStorageService, useValue: { get: () => 'test-token', set: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key, currentLang: 'en' } },
      ],
    });
    service = TestBed.inject(DataAutoWizardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    await service.stopConnection();
    httpMock.verify();
    Object.defineProperty(signalR, 'HubConnectionBuilder', {
      configurable: true,
      writable: true,
      value: originalBuilder,
    });
  });

  async function startJob(jobId = 'job-1') {
    const promise = service.start(REQUEST);
    await tick();
    httpMock.expectOne((req) => req.url.endsWith('AutoWizard/Start')).flush({ jobId });
    await promise;
    return connections[connections.length - 1];
  }

  it('start connects, joins the job group and sets running', async () => {
    const connection = await startJob();

    expect(service.status()).toBe('running');
    expect(service.currentJobId()).toBe('job-1');
    expect(connection.sendCalls).toContainEqual({ method: 'JoinJob', args: ['job-1'] });
  });

  it('ignores completed events carrying a foreign jobId', async () => {
    const connection = await startJob();

    connection.emit('OnCompleted', makeResult('other-job'));

    expect(service.result()).toBeNull();
    expect(service.status()).toBe('running');

    connection.emit('OnCompleted', makeResult('job-1'));

    expect(service.result()?.jobId).toBe('job-1');
    expect(service.status()).toBe('completed');
  });

  it('maps the structured too-large 400 body to the translated failure reason', async () => {
    const promise = service.start(REQUEST);
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('AutoWizard/Start'))
      .flush(
        { code: AUTO_WIZARD_LIMITS.tooLargeErrorCode, agents: 300, shifts: 90, periodDays: 30 },
        { status: 400, statusText: 'Bad Request' },
      );

    await expect(promise).rejects.toBeTruthy();
    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toBe('autoWizard.toast.tooLarge');
  });

  it('recovers a completed result via the status endpoint when the connection closes', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('AutoWizard/Status/job-1'))
      .flush({ status: 'completed', result: makeResult('job-1'), reason: null });
    await tick();

    expect(service.status()).toBe('completed');
    expect(service.result()?.finalScenarioId).toBe('scenario-1');
  });

  it('marks the job failed when the server no longer tracks it after close', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('AutoWizard/Status/job-1'))
      .flush({ status: 'unknown', result: null, reason: null });
    await tick();

    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toContain('no longer tracked');
  });

  it('keeps the partial scenario a failed chain still produced', async () => {
    const connection = await startJob();

    connection.emit('OnFailed', {
      jobId: 'job-1',
      failedStage: 'HolisticHarmonizer',
      reason: 'model unreachable',
      partialScenarioId: 'scenario-2',
      partialScenarioToken: 'token-2',
      partialScenarioName: 'Auto Harmonizer',
    });

    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toContain('model unreachable');
    expect(service.partialResult()?.partialScenarioName).toBe('Auto Harmonizer');
  });

  it('reports no partial result when the first stage already failed', async () => {
    const connection = await startJob();

    connection.emit('OnFailed', {
      jobId: 'job-1',
      failedStage: 'Wizard',
      reason: 'Wizard stage did not produce a result.',
      partialScenarioId: null,
      partialScenarioToken: null,
      partialScenarioName: null,
    });

    expect(service.status()).toBe('failed');
    expect(service.partialResult()).toBeNull();
  });

  it('ignores a failure carrying a foreign jobId', async () => {
    const connection = await startJob();

    connection.emit('OnFailed', {
      jobId: 'other-job',
      failedStage: 'Wizard',
      reason: 'not our run',
      partialScenarioId: null,
      partialScenarioToken: null,
      partialScenarioName: null,
    });

    expect(service.status()).toBe('running');
    expect(service.failureReason()).toBeNull();
  });
});

