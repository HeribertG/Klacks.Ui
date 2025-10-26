import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerTableComponent } from './container-table.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IShift, Shift, ShiftStatus, ShiftType } from 'src/app/domain/models/shift-class';

describe('ContainerTableComponent', () => {
  let component: ContainerTableComponent;
  let fixture: ComponentFixture<ContainerTableComponent>;
  let sortingService: TableSortingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContainerTableComponent, TranslateModule.forRoot()],
      providers: [TranslateService, TableSortingService]
    }).compileComponents();

    fixture = TestBed.createComponent(ContainerTableComponent);
    component = fixture.componentInstance;
    sortingService = TestBed.inject(TableSortingService);

    sortingService.initialize({
      columns: ['abbreviation', 'name', 'description', 'valid_from', 'valid_until'],
      defaultOrderBy: 'name',
      defaultSortOrder: 'asc',
      useThreeWaySort: true
    });

    component.sortingService = sortingService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Properties', () => {
    it('should have translate service injected', () => {
      expect(component.translate).toBeDefined();
    });

    it('should have undefined shifts initially', () => {
      expect(component.shifts).toBeUndefined();
    });

    it('should have undefined highlightRowId initially', () => {
      expect(component.highlightRowId).toBeUndefined();
    });

    it('should have undefined selectedRowId initially', () => {
      expect(component.selectedRowId).toBeUndefined();
    });

    it('should have undefined hoveredRowId initially', () => {
      expect(component.hoveredRowId).toBeUndefined();
    });
  });

  describe('Input Properties', () => {
    it('should accept shifts input', () => {
      // Arrange
      const testShifts: IShift[] = [
        createTestShift('1', 'Container 1'),
        createTestShift('2', 'Container 2')
      ];

      // Act
      component.shifts = testShifts;
      fixture.detectChanges();

      // Assert
      expect(component.shifts).toEqual(testShifts);
      expect(component.shifts!.length).toBe(2);
    });

    it('should accept sortingService input', () => {
      // Arrange & Act
      component.sortingService = sortingService;

      // Assert
      expect(component.sortingService).toBeDefined();
      expect(component.sortingService).toBe(sortingService);
    });
  });

  describe('Mouse Events', () => {
    it('should set hoveredRowId on mouse enter', () => {
      // Arrange
      const testShift = createTestShift('test-id', 'Test Shift');

      // Act
      component.onMouseEnter(testShift);

      // Assert
      expect(component.hoveredRowId).toBe('test-id');
    });

    it('should clear hoveredRowId on mouse leave', () => {
      // Arrange
      component.hoveredRowId = 'test-id';

      // Act
      component.onMouseLeave();

      // Assert
      expect(component.hoveredRowId).toBeUndefined();
    });

    it('should handle multiple mouse enter events', () => {
      // Arrange
      const shift1 = createTestShift('id-1', 'Shift 1');
      const shift2 = createTestShift('id-2', 'Shift 2');

      // Act
      component.onMouseEnter(shift1);
      expect(component.hoveredRowId).toBe('id-1');

      component.onMouseEnter(shift2);
      expect(component.hoveredRowId).toBe('id-2');

      // Assert
      expect(component.hoveredRowId).toBe('id-2');
    });
  });

  describe('Click Events', () => {
    it('should set selectedRowId and emit rowClicked on click', () => {
      // Arrange
      const testShift = createTestShift('selected-id', 'Selected Shift');
      spyOn(component.rowClicked, 'emit');

      // Act
      component.onClickRow(testShift);

      // Assert
      expect(component.selectedRowId).toBe('selected-id');
      expect(component.rowClicked.emit).toHaveBeenCalledWith(testShift);
    });

    it('should emit editClicked and stop propagation on edit click', () => {
      // Arrange
      const testShift = createTestShift('edit-id', 'Edit Shift');
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');
      spyOn(component.editClicked, 'emit');

      // Act
      component.onClickEdit(testShift, mockEvent);

      // Assert
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.editClicked.emit).toHaveBeenCalledWith(testShift);
    });

    it('should emit cutClicked and stop propagation on cut click', () => {
      // Arrange
      const testShift = createTestShift('cut-id', 'Cut Shift');
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');
      spyOn(component.cutClicked, 'emit');

      // Act
      component.onClickCut(testShift, mockEvent);

      // Assert
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.cutClicked.emit).toHaveBeenCalledWith(testShift);
    });

    it('should emit headerClicked on header click', () => {
      // Arrange
      const columnKey = 'name';
      spyOn(component.headerClicked, 'emit');

      // Act
      component.onClickHeader(columnKey);

      // Assert
      expect(component.headerClicked.emit).toHaveBeenCalledWith(columnKey);
    });
  });

  describe('Event Emitters', () => {
    it('should have editClicked emitter defined', () => {
      expect(component.editClicked).toBeDefined();
    });

    it('should have cutClicked emitter defined', () => {
      expect(component.cutClicked).toBeDefined();
    });

    it('should have rowClicked emitter defined', () => {
      expect(component.rowClicked).toBeDefined();
    });

    it('should have headerClicked emitter defined', () => {
      expect(component.headerClicked).toBeDefined();
    });
  });

  describe('Integration with Sorting', () => {
    it('should use sortingService for arrows', () => {
      // Arrange
      spyOn(sortingService, 'getArrow').and.returnValue('↑');

      // Act
      const arrow = sortingService.getArrow('name');

      // Assert
      expect(sortingService.getArrow).toHaveBeenCalledWith('name');
      expect(arrow).toBe('↑');
    });

    it('should emit headerClicked when column header is clicked', () => {
      // Arrange
      spyOn(component.headerClicked, 'emit');

      // Act
      component.onClickHeader('abbreviation');

      // Assert
      expect(component.headerClicked.emit).toHaveBeenCalledWith('abbreviation');
    });

    it('should support all sortable columns', () => {
      // Arrange
      const sortableColumns = ['abbreviation', 'name', 'description', 'valid_from', 'valid_until'];
      spyOn(component.headerClicked, 'emit');

      // Act & Assert
      sortableColumns.forEach(column => {
        component.onClickHeader(column);
        expect(component.headerClicked.emit).toHaveBeenCalledWith(column);
      });

      expect(component.headerClicked.emit).toHaveBeenCalledTimes(5);
    });
  });

  describe('Container Shifts Display', () => {
    it('should display container shifts', () => {
      // Arrange
      const containerShifts: IShift[] = [
        createContainerShift('1', 'Container Shift 1'),
        createContainerShift('2', 'Container Shift 2')
      ];

      // Act
      component.shifts = containerShifts;
      fixture.detectChanges();

      // Assert
      expect(component.shifts).toEqual(containerShifts);
      component.shifts!.forEach(shift => {
        expect(shift.shiftType).toBe(ShiftType.IsContainer);
      });
    });

    it('should handle empty shifts array', () => {
      // Arrange
      component.shifts = [];

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.shifts).toEqual([]);
      expect(component.shifts!.length).toBe(0);
    });

    it('should handle shifts with different statuses', () => {
      // Arrange
      const mixedShifts: IShift[] = [
        { ...createContainerShift('1', 'Container 1'), status: ShiftStatus.OriginalShift },
        { ...createContainerShift('2', 'Container 2'), status: ShiftStatus.SplitShift }
      ];

      // Act
      component.shifts = mixedShifts;
      fixture.detectChanges();

      // Assert
      expect(component.shifts![0].status).toBe(ShiftStatus.OriginalShift);
      expect(component.shifts![1].status).toBe(ShiftStatus.SplitShift);
      component.shifts!.forEach(shift => {
        expect(shift.shiftType).toBe(ShiftType.IsContainer);
      });
    });
  });

  describe('Row Selection State', () => {
    it('should maintain selectedRowId when clicking different rows', () => {
      // Arrange
      const shift1 = createTestShift('row-1', 'Row 1');
      const shift2 = createTestShift('row-2', 'Row 2');

      // Act
      component.onClickRow(shift1);
      expect(component.selectedRowId).toBe('row-1');

      component.onClickRow(shift2);

      // Assert
      expect(component.selectedRowId).toBe('row-2');
    });

    it('should allow clicking the same row multiple times', () => {
      // Arrange
      const testShift = createTestShift('same-row', 'Same Row');
      spyOn(component.rowClicked, 'emit');

      // Act
      component.onClickRow(testShift);
      component.onClickRow(testShift);
      component.onClickRow(testShift);

      // Assert
      expect(component.selectedRowId).toBe('same-row');
      expect(component.rowClicked.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle hover and selection independently', () => {
      // Arrange
      const hoverShift = createTestShift('hover-id', 'Hover');
      const selectedShift = createTestShift('selected-id', 'Selected');

      // Act
      component.onMouseEnter(hoverShift);
      component.onClickRow(selectedShift);

      // Assert
      expect(component.hoveredRowId).toBe('hover-id');
      expect(component.selectedRowId).toBe('selected-id');
      expect(component.hoveredRowId).not.toBe(component.selectedRowId);
    });
  });
});

// Helper functions
function createTestShift(id: string, name: string): Shift {
  const shift = new Shift();
  shift.id = id;
  shift.name = name;
  shift.abbreviation = name.substring(0, 2).toUpperCase();
  shift.description = `Description for ${name}`;
  shift.startShift = '08:00';
  shift.endShift = '16:00';
  shift.fromDate = new Date();
  shift.status = ShiftStatus.OriginalShift;
  shift.shiftType = ShiftType.IsTask;
  return shift;
}

function createContainerShift(id: string, name: string): Shift {
  const shift = createTestShift(id, name);
  shift.shiftType = ShiftType.IsContainer;
  return shift;
}
