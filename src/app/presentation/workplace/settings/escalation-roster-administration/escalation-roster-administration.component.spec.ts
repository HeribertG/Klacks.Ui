// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { EscalationRosterAdministrationComponent } from './escalation-roster-administration.component';
import { DataGroupVisibilityService } from 'src/app/infrastructure/api/group/data-group-visibility.service';
import { DataEscalationRosterService } from 'src/app/infrastructure/api/assistant/data-escalation-roster.service';
import { DataUserAbsencePeriodService } from 'src/app/infrastructure/api/settings/data-user-absence-period.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { IEscalationRosterMember, IUserAbsencePeriod } from 'src/app/domain/interfaces/escalation-roster.interface';
import { IGroup } from 'src/app/domain/models/group/group-class';

describe('EscalationRosterAdministrationComponent', () => {
    let component: EscalationRosterAdministrationComponent;
    let fixture: ComponentFixture<EscalationRosterAdministrationComponent>;
    let mockGroupVisibilityService: any;
    let mockRosterService: any;
    let mockAbsenceService: any;
    let mockEventBus: any;

    const roots: IGroup[] = [
        { id: 'root-1', name: 'Root One' } as IGroup,
        { id: 'root-2', name: 'Root Two' } as IGroup,
    ];

    const member = (overrides: Partial<IEscalationRosterMember> = {}): IEscalationRosterMember => ({
        userId: 'user-1',
        displayName: 'Alice',
        hasPhoneNumber: true,
        isCurrentlyAbsent: false,
        ...overrides,
    });

    const period = (overrides: Partial<IUserAbsencePeriod> = {}): IUserAbsencePeriod => ({
        id: 'period-1',
        appUserId: 'user-1',
        startDate: '2026-08-01',
        endDate: '2026-08-10',
        reason: null,
        ...overrides,
    });

    beforeEach(async () => {
        mockGroupVisibilityService = { getRoots: vi.fn(() => of(roots)) };
        mockRosterService = { getRoster: vi.fn(() => of([])) };
        mockAbsenceService = {
            getByUser: vi.fn(() => of([])),
            create: vi.fn(() => of(period())),
            delete: vi.fn(() => of(undefined)),
        };
        mockEventBus = { emit: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [EscalationRosterAdministrationComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataGroupVisibilityService, useValue: mockGroupVisibilityService },
                { provide: DataEscalationRosterService, useValue: mockRosterService },
                { provide: DataUserAbsencePeriodService, useValue: mockAbsenceService },
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EscalationRosterAdministrationComponent);
        component = fixture.componentInstance;
    });

    it('loads roots on init', () => {
        fixture.detectChanges();

        expect(mockGroupVisibilityService.getRoots).toHaveBeenCalledTimes(1);
        expect(component.roots()).toEqual(roots);
    });

    it('loads the roster when a root is selected', () => {
        const members = [member({ userId: 'user-a', displayName: 'Alice' })];
        mockRosterService.getRoster.mockReturnValue(of(members));
        fixture.detectChanges();

        component.onGroupChange('root-1');

        expect(mockRosterService.getRoster).toHaveBeenCalledWith('root-1');
        expect(component.members()).toEqual(members);
    });

    it('clears the roster when the selection is cleared', () => {
        mockRosterService.getRoster.mockReturnValue(of([member()]));
        fixture.detectChanges();
        component.onGroupChange('root-1');
        expect(component.members().length).toBe(1);

        component.onGroupChange('');

        expect(component.members()).toEqual([]);
    });

    describe('absence editor', () => {
        beforeEach(() => {
            mockRosterService.getRoster.mockReturnValue(of([member({ userId: 'user-a' })]));
            fixture.detectChanges();
            component.onGroupChange('root-1');
        });

        it('expands and loads absence periods for the selected member', () => {
            mockAbsenceService.getByUser.mockReturnValue(of([period({ appUserId: 'user-a' })]));

            component.toggleAbsenceEditor('user-a');

            expect(component.expandedUserId()).toBe('user-a');
            expect(mockAbsenceService.getByUser).toHaveBeenCalledWith('user-a');
            expect(component.absencePeriods()).toEqual([period({ appUserId: 'user-a' })]);
        });

        it('collapses when toggled again', () => {
            component.toggleAbsenceEditor('user-a');
            component.toggleAbsenceEditor('user-a');

            expect(component.expandedUserId()).toBe('');
            expect(component.absencePeriods()).toEqual([]);
        });

        it('fills the end date with the permanent sentinel', () => {
            component.toggleAbsenceEditor('user-a');

            component.fillPermanentEndDate();

            expect(component.newAbsenceEnd()).toBe('9999-12-31');
        });

        it('adds an absence period and refreshes both the list and the roster', () => {
            component.toggleAbsenceEditor('user-a');
            component.newAbsenceStart.set('2026-09-01');
            component.newAbsenceEnd.set('2026-09-10');
            component.newAbsenceReason.set('Ferien');
            mockRosterService.getRoster.mockClear();

            component.addAbsencePeriod();

            expect(mockAbsenceService.create).toHaveBeenCalledWith('user-a', '2026-09-01', '2026-09-10', 'Ferien');
            expect(mockAbsenceService.getByUser).toHaveBeenCalledWith('user-a');
            expect(mockRosterService.getRoster).toHaveBeenCalledWith('root-1');
        });

        it('does nothing when start or end date is missing', () => {
            component.toggleAbsenceEditor('user-a');
            mockAbsenceService.create.mockClear();

            component.addAbsencePeriod();

            expect(mockAbsenceService.create).not.toHaveBeenCalled();
        });

        it('deletes an absence period and refreshes both the list and the roster', () => {
            component.toggleAbsenceEditor('user-a');
            mockRosterService.getRoster.mockClear();

            component.deleteAbsencePeriod('period-1');

            expect(mockAbsenceService.delete).toHaveBeenCalledWith('period-1');
            expect(mockRosterService.getRoster).toHaveBeenCalledWith('root-1');
        });
    });

    it('emits an error event when loading roots fails', () => {
        mockGroupVisibilityService.getRoots.mockReturnValue(throwError(() => new Error('boom')));
        fixture.detectChanges();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ code: 'ESCALATION_ROSTER_LOAD_ROOTS_ERROR' }),
        );
    });

    it('emits an error event when loading the roster fails', () => {
        mockRosterService.getRoster.mockReturnValue(throwError(() => new Error('boom')));
        fixture.detectChanges();

        component.onGroupChange('root-1');

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ code: 'ESCALATION_ROSTER_LOAD_ERROR' }),
        );
    });
});
