// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as signalR from '@microsoft/signalr';
import { DataHolisticHarmonizerService } from './data-holistic-harmonizer.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import {
  HolisticHarmonizerRunRequest,
  HolisticHarmonizerRunResponse,
} from 'src/app/domain/models/holistic-harmonizer/holistic-harmonizer-run.model';

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

const REQUEST: HolisticHarmonizerRunRequest = {
  periodFrom: '2026-04-01',
  periodUntil: '2026-04-30',
  agentIds: ['agent-1'],
  analyseToken: null,
  language: 'en',
};

function makeResult(jobId: string): HolisticHarmonizerRunResponse {
  return {
    jobId,
    llmModelId: 'stub-model',
    fitnessBefore: 0.4,
    fitnessAfter: 0.7,
    acceptedSwaps: [],
    rejectedSwaps: [],
    batches: [],
    agentDisplayNames: [],
    qualificationGaps: [],
    llmParsingError: null,
    llmRawResponsePreview: null,
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('DataHolisticHarmonizerService', () => {
  let service: DataHolisticHarmonizerService;
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
    service = TestBed.inject(DataHolisticHarmonizerService);
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
    httpMock.expectOne((req) => req.url.endsWith('HolisticHarmonizer/Start')).flush({ jobId });
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

    connection.emit('OnProgress', { jobId: 'other-job', iteration: 2, maxIterations: 8 });
    connection.emit('OnCompleted', makeResult('other-job'));

    expect(service.progress()).toBeNull();
    expect(service.result()).toBeNull();
    expect(service.status()).toBe('running');
    expect(service.currentJobId()).toBe('job-1');
  });

  it('completed event with matching jobId sets result and status', async () => {
    const connection = await startJob();

    connection.emit('OnCompleted', makeResult('job-1'));

    expect(service.status()).toBe('completed');
    expect(service.result()?.jobId).toBe('job-1');
  });

  it('recovers a completed result via the status endpoint when the connection closes', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('HolisticHarmonizer/Status/job-1'))
      .flush({ status: 'completed', result: makeResult('job-1'), reason: null });
    await tick();

    expect(service.status()).toBe('completed');
    expect(service.result()?.jobId).toBe('job-1');
  });

  it('marks the run failed when close-reconcile returns unknown', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('HolisticHarmonizer/Status/job-1'))
      .flush({ status: 'unknown', result: null, reason: null });
    await tick();

    expect(service.status()).toBe('failed');
    expect(service.failureReason()).not.toBeNull();
  });

  it('rejoins the job group and reconciles after reconnect', async () => {
    const connection = await startJob();
    connection.sendCalls.length = 0;

    // The reconnect callback awaits the reconcile request, so it must not be awaited before flushing.
    const reconnected = connection.fireReconnected();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('HolisticHarmonizer/Status/job-1'))
      .flush({ status: 'running', result: null, reason: null });
    await reconnected;

    expect(connection.sendCalls).toContainEqual({ method: 'JoinJob', args: ['job-1'] });
    expect(service.status()).toBe('running');
  });

  it('concurrent stopConnection calls do not throw', async () => {
    const connection = await startJob();

    await Promise.all([service.stopConnection(), service.stopConnection()]);

    expect(connection.stopCalls).toBeGreaterThanOrEqual(1);
  });
});
