// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DataManagementEscalationChainService } from './data-management-escalation-chain.service';
import { DataEscalationChainService } from 'src/app/infrastructure/api/assistant/data-escalation-chain.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';

describe('DataManagementEscalationChainService', () => {
    let service: DataManagementEscalationChainService;
    let mockDataService: any;
    let mockAuthorizationService: { isAdmin: boolean };

    const chain = (overrides: Partial<IEscalationChainSummary> = {}): IEscalationChainSummary => ({
        id: 'chain-1',
        workId: 'work-1',
        absentClientName: 'Anna Adler',
        shiftStartUtc: '2026-08-17T06:00:00Z',
        deadlineUtc: '2026-08-17T04:00:00Z',
        canAcknowledge: false,
        stages: [],
        ...overrides,
    });

    beforeEach(() => {
        vi.useFakeTimers();

        mockDataService = {
            getRunning: vi.fn(() => of([])),
            acknowledge: vi.fn(() => of(undefined)),
            cancel: vi.fn(() => of(undefined)),
        };
        mockAuthorizationService = { isAdmin: true };

        TestBed.configureTestingModule({
            providers: [
                { provide: DataEscalationChainService, useValue: mockDataService },
                { provide: AuthorizationService, useValue: mockAuthorizationService },
            ],
        });

        service = TestBed.inject(DataManagementEscalationChainService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('polls immediately when admin', () => {
        vi.advanceTimersByTime(0);

        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });

    it('does not poll when not admin', () => {
        mockAuthorizationService.isAdmin = false;
        vi.advanceTimersByTime(0);

        expect(mockDataService.getRunning).not.toHaveBeenCalled();
    });

    it('polls again after the interval elapses', () => {
        vi.advanceTimersByTime(0);
        vi.advanceTimersByTime(60000);

        expect(mockDataService.getRunning).toHaveBeenCalledTimes(2);
    });

    it('updates runningChains and runningCount from the response', () => {
        mockDataService.getRunning.mockReturnValue(of([chain(), chain({ id: 'chain-2' })]));
        vi.advanceTimersByTime(0);

        expect(service.runningChains().length).toBe(2);
        expect(service.runningCount()).toBe(2);
        expect(service.hasRunning()).toBe(true);
    });

    it('reports hasRunning false when the list is empty', () => {
        vi.advanceTimersByTime(0);

        expect(service.hasRunning()).toBe(false);
    });

    it('refreshes after a successful acknowledge', () => {
        vi.advanceTimersByTime(0);
        mockDataService.getRunning.mockClear();

        service.acknowledge('chain-1').subscribe();

        expect(mockDataService.acknowledge).toHaveBeenCalledWith('chain-1');
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });

    it('refreshes after a successful cancel', () => {
        vi.advanceTimersByTime(0);
        mockDataService.getRunning.mockClear();

        service.cancel('chain-1', 'no reachable planner').subscribe();

        expect(mockDataService.cancel).toHaveBeenCalledWith('chain-1', 'no reachable planner');
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });
});
