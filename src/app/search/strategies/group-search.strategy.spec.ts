import { TestBed } from '@angular/core/testing';
import { GroupSearchStrategy } from './group-search.strategy';
import { DataManagementGroupService } from 'src/app/domain/services/data-management-group.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

describe('GroupSearchStrategy', () => {
  let strategy: GroupSearchStrategy;
  let mockGroupService: jasmine.SpyObj<DataManagementGroupService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DataManagementGroupService', ['readPage'], {
      currentFilter: { searchString: '' },
      onExternalFilterChange: jasmine.createSpy()
    });

    TestBed.configureTestingModule({
      providers: [
        GroupSearchStrategy,
        { provide: DataManagementGroupService, useValue: spy }
      ]
    });

    strategy = TestBed.inject(GroupSearchStrategy);
    mockGroupService = TestBed.inject(DataManagementGroupService) as jasmine.SpyObj<DataManagementGroupService>;
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should return correct entity name', () => {
    expect(strategy.getEntityName()).toBe(EntityName.GROUP);
  });

  it('should search with correct parameters', () => {
    strategy.search('test group');

    expect(mockGroupService.currentFilter.searchString).toBe('test group');
    expect(mockGroupService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockGroupService.readPage).toHaveBeenCalled();
  });

  it('should reset filter correctly', () => {
    strategy.resetFilter();

    expect(mockGroupService.currentFilter.searchString).toBe('');
    expect(mockGroupService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockGroupService.readPage).toHaveBeenCalled();
  });
});