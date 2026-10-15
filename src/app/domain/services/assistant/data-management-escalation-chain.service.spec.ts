// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { DataManagementEscalationChainService } from './data-management-escalation-chain.service';
import { DataEscalationChainService } from 'src/app/infrastructure/api/assistant/data-escalation-chain.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';

describe('DataManagementEscalationChainService', () => {
    let service: DataManagementEscalationChainService;
    let mockDataService: any;
    let mockAuthorizationService: { hasPermission: (p: string) => boolean };
    let isAdmin: boolean;
    let canViewSchedule: boolean;
    let inboxChanged$: Subject<unknown>;
    let proactiveMessage$: Subject<unknown>;

    const chain = (overrides: Partial<IEscalationChainSummary> = {}): IEscalationChainSummary => ({
        id: 'chain-1',
        purpose: 'AbsenceCoverage',
        workId: 'work-1',
        conditionId: null,
        absentClientName: 'Anna Adler',
        shiftStartUtc: '2026-08-17T06:00:00Z',
        deadlineUtc: '2026-08-17T04:00:00Z',
        startedAtUtc: null,
        groupName: null,
        findingKind: null,
        groupId: null,
        scenarioId: null,
        wakeNotBeforeUtc: null,
        canAcknowledge: false,
        canCancel: true,
        stages: [],
        ...overrides,
    });

    beforeEach(() => {
        vi.useFakeTimers();

        mockDataService = {
            getRunning: vi.fn(() => of([])),
            acknowledge: vi.fn(() => of({ outcome: 'Acknowledged', chainStatus: 'Acknowledged' })),
            cancel: vi.fn(() => of(undefined)),
        };
        isAdmin = true;
        canViewSchedule = true;
        inboxChanged$ = new Subject<unknown>();
        proactiveMessage$ = new Subject<unknown>();
        mockAuthorizationService = {
            hasPermission: (p: string) =>
                p === ROLE_ADMIN ? isAdmin : p === PERMISSIONS.CanViewSchedule ? canViewSchedule : false,
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: DataEscalationChainService, useValue: mockDataService },
                { provide: AuthorizationService, useValue: mockAuthorizationService },
                { provide: AssistantSignalRService, useValue: { proactiveInboxChanged$: inboxChanged$, proactiveMessage$ } },
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

    it('does not poll without the schedule view right', () => {
        isAdmin = false;
        canViewSchedule = false;
        vi.advanceTimersByTime(0);
        vi.advanceTimersByTime(600000);

        expect(mockDataService.getRunning).not.toHaveBeenCalled();
    });

    it('polls a planner who is not an admin only every five minutes', () => {
        isAdmin = false;
        vi.advanceTimersByTime(0);
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(240000);
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(60000);
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(2);
    });

    it('refreshes at once when the per-user inbox push arrives', () => {
        isAdmin = false;
        vi.advanceTimersByTime(0);
        mockDataService.getRunning.mockClear();

        inboxChanged$.next({ unreadCount: 1 });

        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });

    it('refreshes at once when the stage alert arrives as a proactive message', () => {
        isAdmin = false;
        vi.advanceTimersByTime(0);
        mockDataService.getRunning.mockClear();

        proactiveMessage$.next({ messageId: 'row-1', kind: 'escalation_stage_alert' });

        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });

    it('ignores proactive messages of any other kind', () => {
        isAdmin = false;
        vi.advanceTimersByTime(0);
        mockDataService.getRunning.mockClear();

        proactiveMessage$.next({ messageId: 'row-2', kind: 'morning_report' });

        expect(mockDataService.getRunning).not.toHaveBeenCalled();
    });

    it('polls at the first tick that passes the permission check, not only at the next five-minute tick', () => {
        isAdmin = false;
        canViewSchedule = false;
        vi.advanceTimersByTime(0);
        expect(mockDataService.getRunning).not.toHaveBeenCalled();

        canViewSchedule = true;
        vi.advanceTimersByTime(60000);

        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(60000);
        expect(mockDataService.getRunning).toHaveBeenCalledTimes(1);
    });

    it('ignores the inbox push without the schedule view right', () => {
        canViewSchedule = false;
        vi.advanceTimersByTime(0);

        inboxChanged$.next({ unreadCount: 1 });

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
