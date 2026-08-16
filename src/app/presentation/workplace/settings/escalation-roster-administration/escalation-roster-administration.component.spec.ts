// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { EscalationRosterAdministrationComponent } from './escalation-roster-administration.component';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataEscalationRosterService } from 'src/app/infrastructure/api/assistant/data-escalation-roster.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { IEscalationRosterEntry } from 'src/app/domain/interfaces/escalation-roster.interface';
import { IGroup } from 'src/app/domain/models/group/group-class';

describe('EscalationRosterAdministrationComponent', () => {
    let component: EscalationRosterAdministrationComponent;
    let fixture: ComponentFixture<EscalationRosterAdministrationComponent>;
    let mockGroupService: any;
    let mockRosterService: any;
    let mockEventBus: any;

    const groups: IGroup[] = [
        { id: 'group-1', name: 'Group One' } as IGroup,
        { id: 'group-2', name: 'Group Two' } as IGroup,
    ];

    const entry = (overrides: Partial<IEscalationRosterEntry> = {}): IEscalationRosterEntry => ({
        id: 'entry-1',
        userId: 'user-1',
        displayName: 'Alice',
        effectiveRank: 1,
        hasOverride: false,
        isOrphaned: false,
        ...overrides,
    });

    beforeEach(async () => {
        mockGroupService = { readGroupList: vi.fn(() => of({ groups, maxItems: groups.length, maxPages: 1, currentPage: 0 })) };
        mockRosterService = {
            getRoster: vi.fn(() => of([])),
            setOrder: vi.fn(() => of(undefined)),
        };
        mockEventBus = { emit: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [EscalationRosterAdministrationComponent, TranslateModule.forRoot()],
            providers: [
                { provide: DataGroupService, useValue: mockGroupService },
                { provide: DataEscalationRosterService, useValue: mockRosterService },
                { provide: EVENT_BUS_TOKEN, useValue: mockEventBus },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EscalationRosterAdministrationComponent);
        component = fixture.componentInstance;
    });

    it('loads groups on init', () => {
        fixture.detectChanges();

        expect(mockGroupService.readGroupList).toHaveBeenCalledTimes(1);
        expect(component.groups()).toEqual(groups);
    });

    it('loads the roster when a group is selected', () => {
        const entries = [entry({ id: 'a', userId: 'user-a', displayName: 'Alice', effectiveRank: 1 })];
        mockRosterService.getRoster.mockReturnValue(of(entries));
        fixture.detectChanges();

        component.onGroupChange('group-1');

        expect(mockRosterService.getRoster).toHaveBeenCalledWith('group-1');
        expect(component.entries()).toEqual(entries);
    });

    it('clears the roster when the group selection is cleared', () => {
        mockRosterService.getRoster.mockReturnValue(of([entry()]));
        fixture.detectChanges();
        component.onGroupChange('group-1');
        expect(component.entries().length).toBe(1);

        component.onGroupChange('');

        expect(component.entries()).toEqual([]);
    });

    it('splits active and orphaned entries', () => {
        const active = entry({ id: 'a', userId: 'user-a', isOrphaned: false });
        const orphaned = entry({ id: 'b', userId: 'user-b', isOrphaned: true, effectiveRank: null });
        mockRosterService.getRoster.mockReturnValue(of([active, orphaned]));
        fixture.detectChanges();

        component.onGroupChange('group-1');

        expect(component.activeEntries()).toEqual([active]);
        expect(component.orphanedEntries()).toEqual([orphaned]);
    });

    describe('reordering', () => {
        const entries = [
            entry({ id: 'a', userId: 'user-a', displayName: 'Alice', effectiveRank: 1 }),
            entry({ id: 'b', userId: 'user-b', displayName: 'Bob', effectiveRank: 2 }),
            entry({ id: 'c', userId: 'user-c', displayName: 'Carol', effectiveRank: 3 }),
        ];

        beforeEach(() => {
            mockRosterService.getRoster.mockReturnValue(of(entries));
            fixture.detectChanges();
            component.onGroupChange('group-1');
        });

        it('moves an entry up and persists the new order', () => {
            component.moveUp(1);

            expect(component.activeEntries().map((e) => e.userId)).toEqual(['user-b', 'user-a', 'user-c']);
            expect(mockRosterService.setOrder).toHaveBeenCalledWith('group-1', ['user-b', 'user-a', 'user-c']);
        });

        it('moves an entry down and persists the new order', () => {
            component.moveDown(0);

            expect(component.activeEntries().map((e) => e.userId)).toEqual(['user-b', 'user-a', 'user-c']);
            expect(mockRosterService.setOrder).toHaveBeenCalledWith('group-1', ['user-b', 'user-a', 'user-c']);
        });

        it('does nothing when moving the first entry up', () => {
            component.moveUp(0);

            expect(component.activeEntries().map((e) => e.userId)).toEqual(['user-a', 'user-b', 'user-c']);
            expect(mockRosterService.setOrder).not.toHaveBeenCalled();
        });

        it('does nothing when moving the last entry down', () => {
            component.moveDown(2);

            expect(component.activeEntries().map((e) => e.userId)).toEqual(['user-a', 'user-b', 'user-c']);
            expect(mockRosterService.setOrder).not.toHaveBeenCalled();
        });
    });

    it('emits an error event when loading groups fails', () => {
        mockGroupService.readGroupList.mockReturnValue(throwError(() => new Error('boom')));
        fixture.detectChanges();

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ code: 'ESCALATION_ROSTER_LOAD_GROUPS_ERROR' }),
        );
    });
});
