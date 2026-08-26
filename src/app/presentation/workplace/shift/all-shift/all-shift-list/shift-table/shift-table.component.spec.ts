// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShiftTableComponent } from './shift-table.component';
import { TranslateModule } from '@ngx-translate/core';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { Shift, ShiftStatus, ShiftType } from 'src/app/domain/models/shift/shift-class';

describe('ShiftTableComponent', () => {
    let component: ShiftTableComponent;
    let fixture: ComponentFixture<ShiftTableComponent>;
    let mockSortingService: any;

    beforeEach(async () => {
        mockSortingService = {
            getArrow: vi.fn(),
            sortData: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [ShiftTableComponent, TranslateModule.forRoot()],
            providers: [{ provide: TableSortingService, useValue: mockSortingService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ShiftTableComponent);
        component = fixture.componentInstance;
        component.sortingService = mockSortingService;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('tableMode: cut', () => {
        beforeEach(() => {
            component.tableMode = 'cut';
        });

        it('should show sporadic icon when shift is sporadic', () => {
            const shift = new Shift();
            shift.status = ShiftStatus.OriginalShift;
            shift.shiftType = ShiftType.IsTask;
            shift.isSporadic = true;

            expect(component.shouldShowSporadicIcon(shift)).toBe(true);
            expect(component.shouldShowTimeRangeIcon(shift)).toBe(false);
            expect(component.shouldShowShiftSegmentIcon(shift)).toBe(false);
        });

        it('should show time range icon when shift has time range', () => {
            const shift = new Shift();
            shift.status = ShiftStatus.OriginalShift;
            shift.shiftType = ShiftType.IsTask;
            shift.isSporadic = false;
            shift.isTimeRange = true;

            expect(component.shouldShowSporadicIcon(shift)).toBe(false);
            expect(component.shouldShowTimeRangeIcon(shift)).toBe(true);
            expect(component.shouldShowShiftSegmentIcon(shift)).toBe(false);
        });

        it('should show shift segment icon as default', () => {
            const shift = new Shift();
            shift.status = ShiftStatus.OriginalShift;
            shift.shiftType = ShiftType.IsTask;
            shift.isSporadic = false;
            shift.isTimeRange = false;

            expect(component.shouldShowSporadicIcon(shift)).toBe(false);
            expect(component.shouldShowTimeRangeIcon(shift)).toBe(false);
            expect(component.shouldShowShiftSegmentIcon(shift)).toBe(true);
        });

        it('should not show icons for container shift type', () => {
            const shift = new Shift();
            shift.status = ShiftStatus.OriginalShift;
            shift.shiftType = ShiftType.IsContainer;

            expect(component.shouldShowCutIcon(shift)).toBe(false);
        });
    });

    describe('tableMode: container', () => {
        beforeEach(() => {
            component.tableMode = 'container';
        });

        it('should show container icon', () => {
            expect(component.shouldShowContainerIcon()).toBe(true);
        });

        it('should not show cut icons', () => {
            const shift = new Shift();
            shift.status = ShiftStatus.OriginalShift;
            shift.shiftType = ShiftType.IsTask;

            expect(component.shouldShowCutIcon(shift)).toBe(false);
        });
    });

    describe('event handlers', () => {
        it('should emit editClicked event', () => {
            const shift = new Shift();
            const mockEvent = new MouseEvent('click');
            vi.spyOn(component.editClicked, 'emit');

            component.onClickEdit(shift, mockEvent);

            expect(component.editClicked.emit).toHaveBeenCalledWith(shift);
        });

        it('should emit actionClicked event', () => {
            const shift = new Shift();
            const mockEvent = new MouseEvent('click');
            vi.spyOn(component.actionClicked, 'emit');

            component.onClickAction(shift, mockEvent);

            expect(component.actionClicked.emit).toHaveBeenCalledWith(shift);
        });

        it('should emit rowClicked event', () => {
            const shift = new Shift();
            vi.spyOn(component.rowClicked, 'emit');

            component.onClickRow(shift);

            expect(component.rowClicked.emit).toHaveBeenCalledWith(shift);
        });

        it('should emit headerClicked event', () => {
            const columnKey = 'name';
            vi.spyOn(component.headerClicked, 'emit');

            component.onClickHeader(columnKey);

            expect(component.headerClicked.emit).toHaveBeenCalledWith(columnKey);
        });
    });

    describe('hover states', () => {
        it('should set hoveredRowId on mouse enter', () => {
            const shift = new Shift();
            shift.id = 'test-id';

            component.onMouseEnter(shift);

            expect(component.hoveredRowId).toBe('test-id');
        });

        it('should clear hoveredRowId on mouse leave', () => {
            component.hoveredRowId = 'test-id';

            component.onMouseLeave();

            expect(component.hoveredRowId).toBeUndefined();
        });
    });

    describe('getPlainTextDescription', () => {
        it('should return empty string when description is null', () => {
            const shift = new Shift();
            shift.description = '';

            const result = component.getPlainTextDescription(shift);

            expect(result).toBe('');
        });
    });

    describe('attributionFor', () => {
        const handledAtUtc = '2026-08-26T10:00:00Z';

        // The rendered assertions check WHICH key the template picks, not the text it produces:
        // TranslateModule.forRoot() carries no loader, so ngx-translate echoes the key and drops the
        // interpolated date. That is the convention every other spec here follows, and the branch choice
        // is the part this component owns - formatting the date is the date pipe's job, not ours.
        const attributionOf = (entityId: string, stamped = true) =>
            new Map([
                [entityId, { entityId, handledAtUtc: stamped ? handledAtUtc : null, triggerKind: 'empty_container' }]
            ]);

        const containerWithId = (id: string) => {
            const shift = new Shift();
            shift.id = id;
            return shift;
        };

        it('should return the attribution of a container in container mode', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('attributions', attributionOf('container-1'));

            expect(component.attributionFor(containerWithId('container-1'))?.triggerKind).toBe('empty_container');
        });

        it('should return undefined for a shift that has no attribution', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('attributions', attributionOf('container-1'));

            expect(component.attributionFor(containerWithId('container-2'))).toBeUndefined();
        });

        it('should return undefined in cut mode even when an attribution exists', () => {
            component.tableMode = 'cut';
            fixture.componentRef.setInput('attributions', attributionOf('container-1'));

            expect(component.attributionFor(containerWithId('container-1'))).toBeUndefined();
        });

        it('should return undefined when no attributions were loaded', () => {
            component.tableMode = 'container';

            expect(component.attributionFor(containerWithId('container-1'))).toBeUndefined();
        });

        it('should return undefined for a shift without an id', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('attributions', attributionOf('container-1'));

            const shift = new Shift();
            shift.id = undefined;

            expect(component.attributionFor(shift)).toBeUndefined();
        });

        it('should render the dated badge for an attributed container row', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('shifts', [containerWithId('container-1')]);
            fixture.componentRef.setInput('attributions', attributionOf('container-1'));
            fixture.detectChanges();

            const badge = fixture.nativeElement.querySelector('.klacksy-resolved-badge');

            expect(badge).not.toBeNull();
            expect(badge.textContent.trim()).toBe('assistant.proactive.containerAutoResolved');
        });

        it('should render the undated badge when the attribution carries no timestamp', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('shifts', [containerWithId('container-1')]);
            fixture.componentRef.setInput('attributions', attributionOf('container-1', false));
            fixture.detectChanges();

            const badge = fixture.nativeElement.querySelector('.klacksy-resolved-badge');

            expect(badge).not.toBeNull();
            expect(badge.textContent.trim()).toBe('assistant.proactive.containerAutoResolvedUndated');
        });

        it('should render no badge for a container row without an attribution', () => {
            component.tableMode = 'container';
            fixture.componentRef.setInput('shifts', [containerWithId('container-1')]);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('.klacksy-resolved-badge')).toBeNull();
        });
    });
});
