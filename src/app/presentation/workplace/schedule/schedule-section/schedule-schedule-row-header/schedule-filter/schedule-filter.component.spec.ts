import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ScheduleFilterComponent } from './schedule-filter.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { WorkFilter } from 'src/app/domain/models/schedule-class';

describe('ScheduleFilterComponent', () => {
  let component: ScheduleFilterComponent;
  let fixture: ComponentFixture<ScheduleFilterComponent>;
  let mockDataManagement: Partial<DataManagementScheduleService>;
  let mockSortingService: Partial<TableSortingService>;
  let testWorkFilter: WorkFilter;

  beforeEach(async () => {
    testWorkFilter = new WorkFilter();
    testWorkFilter.showEmployees = true;
    testWorkFilter.showExtern = true;
    testWorkFilter.hoursSortOrder = undefined;
    testWorkFilter.orderBy = 'name';
    testWorkFilter.sortOrder = 'asc';

    mockDataManagement = {
      workFilter: testWorkFilter,
      readWorkSchedule: vi.fn()
    };

    mockSortingService = {
      initialize: vi.fn(),
      onHeaderClick: vi.fn(),
      getArrow: vi.fn().mockReturnValue(''),
      getCurrentOrderBy: vi.fn().mockReturnValue('name'),
      getCurrentSortOrder: vi.fn().mockReturnValue('asc')
    };

    await TestBed.configureTestingModule({
      imports: [ScheduleFilterComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementScheduleService, useValue: mockDataManagement },
        { provide: TableSortingService, useValue: mockSortingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleFilterComponent);
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

    it('should load filter values from dataManagementSchedule', () => {
      // Arrange
      testWorkFilter.showEmployees = false;
      testWorkFilter.showExtern = true;
      testWorkFilter.hoursSortOrder = 'desc';

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
      expect(mockDataManagement.workFilter!.showEmployees).toBe(false);
      expect(mockDataManagement.readWorkSchedule).toHaveBeenCalled();
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
      expect(mockDataManagement.workFilter!.showExtern).toBe(false);
      expect(mockDataManagement.readWorkSchedule).toHaveBeenCalled();
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
      expect(mockDataManagement.workFilter!.hoursSortOrder).toBe('asc');
      expect(mockDataManagement.readWorkSchedule).toHaveBeenCalled();
    });

    it('should cycle from asc to desc', () => {
      // Arrange
      component.hoursSortOrder = 'asc';

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBe('desc');
      expect(mockDataManagement.workFilter!.hoursSortOrder).toBe('desc');
    });

    it('should cycle from desc to undefined', () => {
      // Arrange
      component.hoursSortOrder = 'desc';

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBeUndefined();
      expect(mockDataManagement.workFilter!.hoursSortOrder).toBeUndefined();
    });

    it('should be independent from primary sorting', () => {
      // Arrange
      component.hoursSortOrder = undefined;
      vi.mocked(mockSortingService.getCurrentOrderBy!).mockReturnValue('firstName');
      vi.mocked(mockSortingService.getCurrentSortOrder!).mockReturnValue('desc');

      // Act
      component.onClickHours();

      // Assert
      expect(component.hoursSortOrder).toBe('asc');
      expect(mockSortingService.getCurrentOrderBy!()).toBe('firstName');
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

  describe('Combined Sorting - Name and Hours', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should allow Name Asc and Hours Desc simultaneously', () => {
      // Arrange
      vi.mocked(mockSortingService.getCurrentOrderBy!).mockReturnValue('name');
      vi.mocked(mockSortingService.getCurrentSortOrder!).mockReturnValue('asc');
      component.hoursSortOrder = 'desc';

      // Act
      vi.mocked(mockSortingService.onHeaderClick!).mockImplementation((_, cb) => cb());
      component.onClickHeader('name');

      // Assert
      expect(component.hoursSortOrder).toBe('desc');
      expect(mockDataManagement.workFilter!.hoursSortOrder).toBe('desc');
    });

    it('should persist hours sort when changing primary sort column', () => {
      // Arrange
      component.hoursSortOrder = 'asc';
      vi.mocked(mockSortingService.onHeaderClick!).mockImplementation((_, cb) => cb());

      // Act
      component.onClickHeader('firstName');

      // Assert
      expect(component.hoursSortOrder).toBe('asc');
      expect(mockDataManagement.workFilter!.hoursSortOrder).toBe('asc');
    });
  });
});
