// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { readStaleWizardResult } from 'src/app/domain/models/schedule/stale-wizard-result.model';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as signalR from '@microsoft/signalr';
import { DataHarmonizerService } from './data-harmonizer.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import { HarmonizerRequest } from 'src/app/domain/models/harmonizer/harmonizer-request.model';
import { HarmonizerResult } from 'src/app/domain/models/harmonizer/harmonizer-progress.model';

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

const REQUEST: HarmonizerRequest = {
  periodFrom: '2026-04-01',
  periodUntil: '2026-04-30',
  agentIds: ['agent-1'],
  analyseToken: null,
};

function makeResult(jobId: string): HarmonizerResult {
  return {
    jobId,
    globalFitnessBefore: 0.5,
    globalFitnessAfter: 0.8,
    generationsRun: 10,
    rowResults: [],
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('DataHarmonizerService', () => {
  let service: DataHarmonizerService;
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
      ],
    });
    service = TestBed.inject(DataHarmonizerService);
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
    httpMock.expectOne((req) => req.url.endsWith('Harmonizer/Start')).flush({ jobId });
    await promise;
    return connections[connections.length - 1];
  }

  it('start connects, joins the job group and sets running', async () => {
    const connection = await startJob();

    expect(service.status()).toBe('running');
    expect(service.currentJobId()).toBe('job-1');
    expect(connection.sendCalls).toContainEqual({ method: 'JoinJob', args: ['job-1'] });
  });

  it('ignores progress and completed events carrying a foreign jobId', async () => {
    const connection = await startJob();

    connection.emit('OnProgress', { jobId: 'other-job', generation: 3, maxGenerations: 10 });
    connection.emit('OnCompleted', makeResult('other-job'));

    expect(service.progress()).toBeNull();
    expect(service.result()).toBeNull();
    expect(service.status()).toBe('running');

    connection.emit('OnCompleted', makeResult('job-1'));

    expect(service.status()).toBe('completed');
  });

  it('recovers a completed result via the status endpoint when the connection closes', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Harmonizer/Status/job-1'))
      .flush({ status: 'completed', result: makeResult('job-1'), reason: null });
    await tick();

    expect(service.status()).toBe('completed');
    expect(service.result()?.jobId).toBe('job-1');
  });

  it('concurrent stopConnection calls do not throw', async () => {
    const connection = await startJob();

    await Promise.all([service.stopConnection(), service.stopConnection()]);

    expect(connection.stopCalls).toBeGreaterThanOrEqual(1);
  });

  it('surfaces the 409 stale-result conflict as a recognisable error', async () => {
    await startJob();

    const promise = service.applyAsScenario('job-1', null);
    await tick();
    httpMock.expectOne((req) => req.url.endsWith('Harmonizer/ApplyAsScenario')).flush(
      {
        errorCode: 'staleWizardResult',
        expectedWorkCount: 4,
        actualWorkCount: 5,
        expectedBreakCount: 1,
        actualBreakCount: 1,
        placementChanged: false,
      },
      { status: 409, statusText: 'Conflict' },
    );

    const error = await promise.catch((e: unknown) => e);
    const stale = readStaleWizardResult(error);
    expect(stale).not.toBeNull();
    expect(stale?.expectedWorkCount).toBe(4);
    expect(stale?.actualWorkCount).toBe(5);
  });

  it('does not mistake another 409 for a stale result', async () => {
    await startJob();

    const promise = service.applyAsScenario('job-1', null);
    await tick();
    httpMock.expectOne((req) => req.url.endsWith('Harmonizer/ApplyAsScenario')).flush(
      { title: 'Conflict', detail: 'something else' },
      { status: 409, statusText: 'Conflict' },
    );

    const error = await promise.catch((e: unknown) => e);
    expect(readStaleWizardResult(error)).toBeNull();
  });
});
