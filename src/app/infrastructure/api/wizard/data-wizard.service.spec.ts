// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataWizardService } from './data-wizard.service';
import { LocalStorageService } from '../../storage/local-storage.service';
import { WizardRequest } from 'src/app/domain/models/wizard/wizard-request.model';
import { WizardResult } from 'src/app/domain/models/wizard/wizard-progress.model';

const signalRFake = vi.hoisted(() => {
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

  return {
    connections,
    module: {
      HubConnectionBuilder: FakeBuilder,
      HubConnectionState: {
        Connected: 'Connected',
        Disconnected: 'Disconnected',
        Reconnecting: 'Reconnecting',
      },
      LogLevel: { Information: 1 },
    },
  };
});

vi.mock('@microsoft/signalr', () => signalRFake.module);

const REQUEST: WizardRequest = {
  periodFrom: '2026-04-01',
  periodUntil: '2026-04-30',
  agentIds: ['agent-1'],
  shiftIds: ['shift-1'],
  analyseToken: null,
};

function makeResult(jobId: string): WizardResult {
  return {
    jobId,
    finalHardViolations: 0,
    finalStage1Completion: 1,
    tokenCount: 1,
    availableShiftSlots: 2,
    tokens: [],
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('DataWizardService', () => {
  let service: DataWizardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    signalRFake.connections.length = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalStorageService, useValue: { get: () => 'test-token', set: vi.fn() } },
      ],
    });
    service = TestBed.inject(DataWizardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function startJob(jobId = 'job-1') {
    const promise = service.start(REQUEST);
    await tick();
    httpMock.expectOne((req) => req.url.endsWith('Wizard/Start')).flush({ jobId });
    await promise;
    return signalRFake.connections[signalRFake.connections.length - 1];
  }

  it('start connects, joins the job group and sets running', async () => {
    const connection = await startJob();

    expect(service.status()).toBe('running');
    expect(service.currentJobId()).toBe('job-1');
    expect(connection.sendCalls).toContainEqual({ method: 'JoinJob', args: ['job-1'] });
  });

  it('ignores progress and completed events carrying a foreign jobId', async () => {
    const connection = await startJob();

    connection.emit('OnProgress', { jobId: 'other-job', generation: 5, maxGenerations: 10 });
    connection.emit('OnCompleted', makeResult('other-job'));

    expect(service.progress()).toBeNull();
    expect(service.result()).toBeNull();
    expect(service.status()).toBe('running');

    connection.emit('OnCompleted', makeResult('job-1'));

    expect(service.result()?.jobId).toBe('job-1');
    expect(service.status()).toBe('completed');
  });

  it('start failure sets status failed and failureReason', async () => {
    const promise = service.start(REQUEST);
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Wizard/Start'))
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toBeTruthy();
  });

  it('concurrent stopConnection calls do not throw', async () => {
    const connection = await startJob();

    await Promise.all([service.stopConnection(), service.stopConnection()]);

    expect(connection.stopCalls).toBeGreaterThanOrEqual(1);
  });

  it('recovers a completed result via the status endpoint when the connection closes', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Wizard/Status/job-1'))
      .flush({ status: 'completed', result: makeResult('job-1'), reason: null });
    await tick();

    expect(service.status()).toBe('completed');
    expect(service.result()?.jobId).toBe('job-1');
  });

  it('falls back to failed when the status endpoint is unreachable after close', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Wizard/Status/job-1'))
      .error(new ProgressEvent('error'));
    await tick();

    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toContain('lost');
  });

  it('marks the job failed when the server no longer tracks it after close', async () => {
    const connection = await startJob();

    connection.fireClose();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Wizard/Status/job-1'))
      .flush({ status: 'unknown', result: null, reason: null });
    await tick();

    expect(service.status()).toBe('failed');
    expect(service.failureReason()).toContain('no longer tracked');
  });

  it('rejoins the job group and reconciles after a reconnect', async () => {
    const connection = await startJob();
    connection.sendCalls.length = 0;

    const reconnected = connection.fireReconnected();
    await tick();
    httpMock
      .expectOne((req) => req.url.endsWith('Wizard/Status/job-1'))
      .flush({ status: 'running', result: null, reason: null });
    await reconnected;

    expect(connection.sendCalls).toContainEqual({ method: 'JoinJob', args: ['job-1'] });
    expect(service.status()).toBe('running');
  });
});
