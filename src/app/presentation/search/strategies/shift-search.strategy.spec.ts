import { TestBed } from '@angular/core/testing';
import { ShiftSearchStrategy } from './shift-search.strategy';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

describe('ShiftSearchStrategy', () => {
  let strategy: ShiftSearchStrategy;
  let mockShiftService: jasmine.SpyObj<DataManagementShiftService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DataManagementShiftService', ['readPage'], {
      currentFilter: { searchString: '', includeClientName: false },
      onExternalFilterChange: jasmine.createSpy()
    });

    TestBed.configureTestingModule({
      providers: [
        ShiftSearchStrategy,
        { provide: DataManagementShiftService, useValue: spy }
      ]
    });

    strategy = TestBed.inject(ShiftSearchStrategy);
    mockShiftService = TestBed.inject(DataManagementShiftService) as jasmine.SpyObj<DataManagementShiftService>;
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should return correct entity name', () => {
    expect(strategy.getEntityName()).toBe(EntityName.SHIFT);
  });

  it('should search with correct parameters', () => {
    strategy.search('night shift', { includeClient: true });

    expect(mockShiftService.currentFilter.searchString).toBe('night shift');
    expect(mockShiftService.currentFilter.includeClientName).toBe(true);
    expect(mockShiftService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockShiftService.readPage).toHaveBeenCalled();
  });

  it('should search with default options', () => {
    strategy.search('day shift');

    expect(mockShiftService.currentFilter.searchString).toBe('day shift');
    expect(mockShiftService.currentFilter.includeClientName).toBe(false);
    expect(mockShiftService.readPage).toHaveBeenCalled();
  });

  it('should reset filter correctly', () => {
    strategy.resetFilter();

    expect(mockShiftService.currentFilter.searchString).toBe('');
    expect(mockShiftService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockShiftService.readPage).toHaveBeenCalled();
  });
});