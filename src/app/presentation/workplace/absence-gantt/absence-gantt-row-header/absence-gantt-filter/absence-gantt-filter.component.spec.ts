import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AbsenceGanttFilterComponent } from './absence-gantt-filter.component';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/absence/data-management-break-placeholder.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { BreakFilter } from 'src/app/domain/models/break-class';

describe('AbsenceGanttFilterComponent', () => {
  let component: AbsenceGanttFilterComponent;
  let fixture: ComponentFixture<AbsenceGanttFilterComponent>;
  let mockDataManagement: Partial<DataManagementBreakPlaceholderService>;
  let mockSortingService: Partial<TableSortingService>;
  let testBreakFilter: BreakFilter;

  beforeEach(async () => {
    testBreakFilter = new BreakFilter();
    testBreakFilter.showEmployees = true;
    testBreakFilter.showExtern = true;
    testBreakFilter.hoursSortOrder = undefined;
    testBreakFilter.orderBy = 'name';
    testBreakFilter.sortOrder = 'asc';

    mockDataManagement = {
      breakFilter: testBreakFilter,
      reRead: vi.fn()
    };

    mockSortingService = {
      initialize: vi.fn(),
      onHeaderClick: vi.fn(),
      getArrow: vi.fn().mockReturnValue(''),
      getCurrentOrderBy: vi.fn().mockReturnValue('name'),
      getCurrentSortOrder: vi.fn().mockReturnValue('asc')
    };

    await TestBed.configureTestingModule({
      imports: [AbsenceGanttFilterComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementBreakPlaceholderService, useValue: mockDataManagement },
        { provide: TableSortingService, useValue: mockSortingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AbsenceGanttFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize sorting service with correct columns', () => {
      // Arrange
      const initializeSpy = vi.spyOn(component.sortingService, 'initialize');

      // Act
      component.ngOnInit();

      // Assert
      expect(initializeSpy).toHaveBeenCalledWith({
        columns: ['firstName', 'company', 'name'],
        defaultOrderBy: 'name',
        defaultSortOrder: 'asc',
        useThreeWaySort: true
      });
    });

    it('should load filter values from dataManagementBreak', () => {
      // Arrange
      testBreakFilter.showEmployees = false;
      testBreakFilter.showExtern = true;
      testBreakFilter.hoursSortOrder = 'desc';

      // Act
      component.ngOnInit();

      // Assert
      expect(component.showEmployees).toBe(false);
      expect(component.showExtern).toBe(true);
      expect(component.hoursSortOrder).toBe('desc');
    });
  });

  describe('onShowEmployeesChange', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update showEmployees and trigger reRead', () => {
      // Arrange
      const event = { target: { checked: false } } as unknown as Event;

      // Act
      component.onShowEmployeesChange(event);

      // Assert
      expect(component.showEmployees).toBe(false);
      expect(mockDataManagement.breakFilter!.showEmployees).toBe(false);
      expect(mockDataManagement.reRead).toHaveBeenCalled();
    });
  });

  describe('onShowExternChange', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update showExtern and trigger reRead', () => {
      // Arrange
      const event = { target: { checked: false } } as unknown as Event;

      // Act
      component.onShowExternChange(event);

      // Assert
      expect(component.showExtern).toBe(false);
      expect(mockDataManagement.breakFilter!.showExtern).toBe(false);
      expect(mockDataManagement.reRead).toHaveBeenCalled();
    });
  });

  describe('onClickHours - Independent Sorting', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should cycle from undefined to asc', () => {
      // Arrange
      component.hoursSortOrder = undefined;

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBe('asc');
      expect(mockDataManagement.breakFilter!.hoursSortOrder).toBe('asc');
      expect(mockDataManagement.reRead).toHaveBeenCalled();
    });

    it('should cycle from asc to desc', () => {
      // Arrange
      component.hoursSortOrder = 'asc';

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBe('desc');
      expect(mockDataManagement.breakFilter!.hoursSortOrder).toBe('desc');
    });

    it('should cycle from desc to undefined', () => {
      // Arrange
      component.hoursSortOrder = 'desc';

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBeUndefined();
      expect(mockDataManagement.breakFilter!.hoursSortOrder).toBeUndefined();
    });

    it('should be independent from primary sorting', () => {
      // Arrange
      component.hoursSortOrder = undefined;
      vi.mocked(mockSortingService.getCurrentOrderBy!).mockReturnValue('company');
      vi.mocked(mockSortingService.getCurrentSortOrder!).mockReturnValue('desc');

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBe('asc');
      expect(mockSortingService.getCurrentOrderBy!()).toBe('company');
      expect(mockSortingService.getCurrentSortOrder!()).toBe('desc');
    });
  });

  describe('getHoursArrow', () => {
    it('should return down arrow for asc', () => {
      // Arrange
      component.hoursSortOrder = 'asc';

      // Act
      const result = component.getHoursArrow();

      // Assert
      expect(result).toBe('↓');
    });

    it('should return up arrow for desc', () => {
      // Arrange
      component.hoursSortOrder = 'desc';

      // Act
      const result = component.getHoursArrow();

      // Assert
      expect(result).toBe('↑');
    });

    it('should return empty string for undefined', () => {
      // Arrange
      component.hoursSortOrder = undefined;

      // Act
      const result = component.getHoursArrow();

      // Assert
      expect(result).toBe('');
    });
  });

  describe('Combined Sorting - Company and Hours', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should allow Company Desc and Hours Asc simultaneously', () => {
      // Arrange
      vi.mocked(mockSortingService.getCurrentOrderBy!).mockReturnValue('company');
      vi.mocked(mockSortingService.getCurrentSortOrder!).mockReturnValue('desc');
      component.hoursSortOrder = 'asc';

      // Act
      vi.mocked(mockSortingService.onHeaderClick!).mockImplementation((_, cb) => cb());
      component.onClickHeader('company');

      // Assert
      expect(component.hoursSortOrder).toBe('asc');
      expect(mockDataManagement.breakFilter!.hoursSortOrder).toBe('asc');
    });

    it('should persist hours sort when changing primary sort column', () => {
      // Arrange
      component.hoursSortOrder = 'desc';
      vi.mocked(mockSortingService.onHeaderClick!).mockImplementation((_, cb) => cb());

      // Act
      component.onClickHeader('firstName');

      // Assert
      expect(component.hoursSortOrder).toBe('desc');
      expect(mockDataManagement.breakFilter!.hoursSortOrder).toBe('desc');
    });
  });
});
