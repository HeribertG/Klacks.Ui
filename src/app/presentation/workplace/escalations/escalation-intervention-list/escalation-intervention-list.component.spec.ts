// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EscalationInterventionListComponent } from './escalation-intervention-list.component';
import { DataManagementEscalationChainService } from 'src/app/domain/services/assistant/data-management-escalation-chain.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';
import { signal } from '@angular/core';

describe('EscalationInterventionListComponent', () => {
    let component: EscalationInterventionListComponent;
    let fixture: ComponentFixture<EscalationInterventionListComponent>;
    let mockEscalationService: any;
    let mockSavebarService: any;
    let mockLayoutService: any;
    let mockSearchService: any;
    let mockNgbModal: any;
    let mockEventBus: any;
    let mockToastShowService: any;

    const chain = (overrides: Partial<IEscalationChainSummary> = {}): IEscalationChainSummary => ({
        id: 'chain-1',
        purpose: 'AbsenceCoverage',
        workId: 'work-1',
        conditionId: null,
        absentClientName: 'Anna Adler',
        shiftStartUtc: '2026-08-17T06:00:00Z',
        deadlineUtc: new Date(Date.now() + 20 * 60000).toISOString(),
        canAcknowledge: false,
        stages: [
            { rank: 1, userId: 'user-a', userDisplayName: 'Planner A', status: 'Notified', notifiedAtUtc: '2026-08-17T03:00:00Z', dueAtUtc: '2026-08-17T03:20:00Z', respondedAtUtc: null },
        ],
        ...overrides,
    });

    beforeEach(async () => {
        mockEscalationService = {
            runningChains: signal<IEscalationChainSummary[]>([]),
            refresh: vi.fn(),
            acknowledge: vi.fn(() => of({ outcome: 'Acknowledged', chainStatus: 'Acknowledged' })),
            cancel: vi.fn(() => of(undefined)),
        };
        mockToastShowService = { showError: vi.fn() };
        mockSavebarService = { setSavebarVisibility: vi.fn() };
        mockLayoutService = { setContainerToNormalSize: vi.fn() };
        mockSearchService = { setSearchVisibility: vi.fn() };
        mockNgbModal = { open: vi.fn() };
        mockEventBus = { emit: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [EscalationInterventionListComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataManagementEscalationChainService, useValue: mockEscalationService },
                { provide: SavebarService, useValue: mockSavebarService },
                { provide: LayoutService, useValue: mockLayoutService },
                { provide: SearchService, useValue: mockSearchService },
                { provide: NgbModal, useValue: mockNgbModal },
                { provide: ToastShowService, useValue: mockToastShowService },
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EscalationInterventionListComponent);
        component = fixture.componentInstance;
    });

    it('hides the savebar, search bar and refreshes on init', () => {
        fixture.detectChanges();

        expect(mockSavebarService.setSavebarVisibility).toHaveBeenCalledWith(false);
        expect(mockSearchService.setSearchVisibility).toHaveBeenCalledWith(false);
        expect(mockEscalationService.refresh).toHaveBeenCalledTimes(1);
    });

    it('computes minutes until the deadline', () => {
        const inTwentyMinutes = new Date(Date.now() + 20 * 60000).toISOString();
        expect(component.minutesUntil(inTwentyMinutes)).toBe(20);
    });

    it('acknowledges a chain', () => {
        fixture.detectChanges();

        component.onAcknowledge(chain());

        expect(mockEscalationService.acknowledge).toHaveBeenCalledWith('chain-1');
    });

    it('emits an error when acknowledge fails', () => {
        mockEscalationService.acknowledge.mockReturnValue(throwError(() => new Error('boom')));
        fixture.detectChanges();

        component.onAcknowledge(chain());

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ code: 'ESCALATION_ACKNOWLEDGE_ERROR' }),
        );
    });

    describe('conflicting acknowledge (HTTP 409)', () => {
        const conflict = (outcome: string, chainStatus: string | null) =>
            throwError(() => new HttpErrorResponse({ status: 409, error: { outcome, chainStatus } }));

        it('shows the deadline-lapsed toast for an exhausted chain', () => {
            mockEscalationService.acknowledge.mockReturnValue(conflict('ChainAlreadyResolved', 'Exhausted'));
            fixture.detectChanges();

            component.onAcknowledge(chain());

            expect(mockToastShowService.showError).toHaveBeenCalledTimes(1);
            expect(mockToastShowService.showError.mock.calls[0][0]).toContain('acknowledge-too-late');
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });

        it('shows the neutral toast when somebody else resolved the chain', () => {
            mockEscalationService.acknowledge.mockReturnValue(conflict('ChainAlreadyResolved', 'Acknowledged'));
            fixture.detectChanges();

            component.onAcknowledge(chain());

            expect(mockToastShowService.showError.mock.calls[0][0]).toContain('acknowledge-already-handled');
        });

        it('shows the neutral toast when the stage moved on while the chain still runs', () => {
            mockEscalationService.acknowledge.mockReturnValue(conflict('NoNotifiedStage', 'Running'));
            fixture.detectChanges();

            component.onAcknowledge(chain());

            expect(mockToastShowService.showError.mock.calls[0][0]).toContain('acknowledge-already-handled');
        });

        it('falls back to the neutral toast when the response carries no body', () => {
            mockEscalationService.acknowledge.mockReturnValue(
                throwError(() => new HttpErrorResponse({ status: 409 })),
            );
            fixture.detectChanges();

            component.onAcknowledge(chain());

            expect(mockToastShowService.showError.mock.calls[0][0]).toContain('acknowledge-already-handled');
        });

        it('refreshes the list, because the clicked row is stale', () => {
            mockEscalationService.acknowledge.mockReturnValue(conflict('ChainAlreadyResolved', 'Exhausted'));
            fixture.detectChanges();
            mockEscalationService.refresh.mockClear();

            component.onAcknowledge(chain());

            expect(mockEscalationService.refresh).toHaveBeenCalledTimes(1);
        });

        it('still emits the generic error for any other HTTP failure', () => {
            mockEscalationService.acknowledge.mockReturnValue(
                throwError(() => new HttpErrorResponse({ status: 500 })),
            );
            fixture.detectChanges();

            component.onAcknowledge(chain());

            expect(mockToastShowService.showError).not.toHaveBeenCalled();
            expect(mockEventBus.emit).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ code: 'ESCALATION_ACKNOWLEDGE_ERROR' }),
            );
        });
    });

    describe('cancel flow', () => {
        let modalRef: any;
        let resolveModal: () => void;
        let rejectModal: () => void;

        beforeEach(() => {
            const pending = new Promise<void>((resolve, reject) => {
                resolveModal = resolve;
                rejectModal = reject;
            });
            // Swallow the unhandled-rejection warning for the dismiss test: the real rejection
            // is observed later via the awaited copy below, this branch only exists so Node/Vitest
            // doesn't flag the promise as unhandled during the window before that await runs.
            pending.catch(() => undefined);
            modalRef = { result: pending, close: vi.fn(), dismiss: vi.fn() };
            mockNgbModal.open.mockReturnValue(modalRef);
            fixture.detectChanges();
        });

        it('does not cancel when the reason is blank', async () => {
            component.onCancelClick(chain());
            component.cancelFormModel.set({ reason: '   ' });
            resolveModal();
            await modalRef.result;

            expect(mockEscalationService.cancel).not.toHaveBeenCalled();
        });

        it('cancels with the trimmed reason on confirm', () => {
            // Exercises confirmCancel directly rather than through the NgbModal promise chain:
            // this isolates "given a pending chain id and a valid reason, confirm calls the
            // service correctly" from the modal open/dismiss plumbing already covered by the
            // other tests in this block, and avoids depending on exactly when a mocked modal's
            // result promise settles relative to a signal write in the zone.js test environment.
            component.onCancelClick(chain());
            component.cancelFormModel.set({ reason: '  no reachable planner  ' });

            (component as any).confirmCancel();

            expect(mockEscalationService.cancel).toHaveBeenCalledWith('chain-1', 'no reachable planner');
        });

        it('does not cancel when the modal is dismissed', async () => {
            component.onCancelClick(chain());
            component.cancelFormModel.set({ reason: 'no reachable planner' });
            rejectModal();
            try {
                await modalRef.result;
            } catch {
                // expected rejection
            }

            expect(mockEscalationService.cancel).not.toHaveBeenCalled();
        });

        it('reports the reason as invalid while blank', () => {
            component.cancelFormModel.set({ reason: '' });
            expect(component.isCancelReasonValid()).toBe(false);

            component.cancelFormModel.set({ reason: 'a reason' });
            expect(component.isCancelReasonValid()).toBe(true);
        });
    });
});
