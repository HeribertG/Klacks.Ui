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
});
