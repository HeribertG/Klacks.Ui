import { TestBed } from '@angular/core/testing';
import { ClientSearchStrategy } from './client-search.strategy';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';

describe('ClientSearchStrategy', () => {
  let strategy: ClientSearchStrategy;
  let mockClientService: jasmine.SpyObj<DataManagementClientService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DataManagementClientService', ['readPage'], {
      currentFilter: { searchString: '', includeAddress: false },
      onExternalFilterChange: jasmine.createSpy()
    });

    TestBed.configureTestingModule({
      providers: [
        ClientSearchStrategy,
        { provide: DataManagementClientService, useValue: spy }
      ]
    });

    strategy = TestBed.inject(ClientSearchStrategy);
    mockClientService = TestBed.inject(DataManagementClientService) as jasmine.SpyObj<DataManagementClientService>;
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should return correct entity name', () => {
    expect(strategy.getEntityName()).toBe(EntityName.CLIENT);
  });

  it('should search with correct parameters', () => {
    strategy.search('test', { includeAddress: true });

    expect(mockClientService.currentFilter.searchString).toBe('test');
    expect(mockClientService.currentFilter.includeAddress).toBe(true);
    expect(mockClientService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockClientService.readPage).toHaveBeenCalled();
  });

  it('should search with default options', () => {
    strategy.search('test');

    expect(mockClientService.currentFilter.searchString).toBe('test');
    expect(mockClientService.currentFilter.includeAddress).toBe(false);
    expect(mockClientService.readPage).toHaveBeenCalled();
  });

  it('should reset filter correctly', () => {
    strategy.resetFilter();

    expect(mockClientService.currentFilter.searchString).toBe('');
    expect(mockClientService.onExternalFilterChange).toHaveBeenCalled();
    expect(mockClientService.readPage).toHaveBeenCalled();
  });
});