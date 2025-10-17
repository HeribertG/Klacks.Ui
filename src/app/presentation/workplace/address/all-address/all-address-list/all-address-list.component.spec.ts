/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllAddressListComponent } from './all-address-list.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { AllAddressStateService } from '../services/all-address-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { LOADING_INDICATOR_TOKEN, ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN, IManageableServiceRegistry } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { FILTER_STORAGE_TOKEN, IFilterStorage } from 'src/app/application/interfaces/filter-storage.interface';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('AllAddressListComponent', () => {
  let component: AllAddressListComponent;
  let fixture: ComponentFixture<AllAddressListComponent>;
  let mockDataManagementClientService: jasmine.SpyObj<DataManagementClientService>;
  let mockAuthorizationService: jasmine.SpyObj<AuthorizationService>;
  let mockLocalStorageService: jasmine.SpyObj<LocalStorageService>;
  let mockModalService: jasmine.SpyObj<ModalService>;
  let mockTableResizeService: jasmine.SpyObj<TableResizeService>;
  let mockAllAddressStateService: jasmine.SpyObj<AllAddressStateService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockLoadingIndicator: ILoadingIndicator;
  let mockRegistry: jasmine.SpyObj<IManageableServiceRegistry>;
  let mockFilterStorage: jasmine.SpyObj<IFilterStorage>;
  let sortingService: TableSortingService;

  beforeEach(async () => {
    mockDataManagementClientService = jasmine.createSpyObj('DataManagementClientService', [
      'init',
      'readPage',
      'deleteClient',
      'exportExcel',
      'findCheckBoxValue',
      'addCheckBoxValueToArray',
      'clearCheckedArray',
      'checkBoxIndeterminate',
      'getLastChangeMetaData',
      'subTitleLastChangesAllAddress'
    ], {
      listWrapper: signal({ clients: [] }),
      currentFilter: { numberOfItemsPerPage: 10, searchString: '', orderBy: 'name', sortOrder: 'asc', requiredPage: 0 },
      paginationDataService: signal({ maxItems: 100, firstItem: 0 }),
      headerCheckBoxValue: signal(false),
      isRead: signal(false),
      initIsRead: signal(false),
      clientListService: {
        headerCheckBoxValue: signal(false)
      },
      clientAttribute: []
    });

    mockAuthorizationService = jasmine.createSpyObj('AuthorizationService', [], {
      isAdmin: true
    });

    mockLocalStorageService = jasmine.createSpyObj('LocalStorageService', ['get', 'set']);
    mockModalService = jasmine.createSpyObj('ModalService', ['openModel', 'setDefault'], {
      resultEvent: of()
    });
    mockTableResizeService = jasmine.createSpyObj('TableResizeService', [
      'calculateOptimalRowCount',
      'createResizeObservable',
      'isAutoMode'
    ]);
    mockAllAddressStateService = jasmine.createSpyObj('AllAddressStateService', [
      'saveCurrentFilter',
      'prepareFilterForRequest',
      'restoreFilterFromStorage',
      'isResizeCalculationAllowed'
    ]);
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToEditAddress'
    ]);

    mockLoadingIndicator = {
      showProgressSpinner: false
    };

    mockRegistry = jasmine.createSpyObj('IManageableServiceRegistry', ['register', 'unregister']);

    mockFilterStorage = jasmine.createSpyObj('IFilterStorage', [
      'saveFilter',
      'restoreFilter',
      'removeFilter',
      'isAvailable',
      'getKeys',
      'clear'
    ]);
    mockFilterStorage.saveFilter.and.returnValue(Promise.resolve(true));
    mockFilterStorage.restoreFilter.and.returnValue(Promise.resolve(null));
    mockFilterStorage.removeFilter.and.returnValue(Promise.resolve(true));
    mockFilterStorage.isAvailable.and.returnValue(Promise.resolve(true));
    mockFilterStorage.getKeys.and.returnValue(Promise.resolve([]));
    mockFilterStorage.clear.and.returnValue(Promise.resolve(true));

    mockLocalStorageService.get.and.returnValue(null);
    mockTableResizeService.createResizeObservable.and.returnValue(of(10));
    mockTableResizeService.isAutoMode.and.returnValue(false);
    mockAllAddressStateService.restoreFilterFromStorage.and.returnValue(Promise.resolve(false));
    mockAllAddressStateService.isResizeCalculationAllowed.and.returnValue(true);
    mockDataManagementClientService.deleteClient.and.returnValue(of(null as any));
    mockDataManagementClientService.subTitleLastChangesAllAddress.and.returnValue('Last changes');

    await TestBed.configureTestingModule({
      imports: [AllAddressListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementClientService, useValue: mockDataManagementClientService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: ModalService, useValue: mockModalService },
        { provide: TableResizeService, useValue: mockTableResizeService },
        { provide: AllAddressStateService, useValue: mockAllAddressStateService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: LOADING_INDICATOR_TOKEN, useValue: mockLoadingIndicator },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
        { provide: FILTER_STORAGE_TOKEN, useValue: mockFilterStorage },
        TableSortingService
      ]
    })
    .overrideComponent(AllAddressListComponent, {
      set: {
        providers: [
          { provide: TableResizeService, useValue: mockTableResizeService },
          { provide: AllAddressStateService, useValue: mockAllAddressStateService },
          TableSortingService
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllAddressListComponent);
    component = fixture.componentInstance;
    sortingService = component.sortingService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize DataManagementClientService', () => {
      fixture.detectChanges();
      expect(mockDataManagementClientService.init).toHaveBeenCalled();
    });

    it('should initialize TableSortingService with correct config', () => {
      spyOn(sortingService, 'initialize');
      fixture.detectChanges();

      expect(sortingService.initialize).toHaveBeenCalledWith({
        columns: ['idNumber', 'company', 'firstName', 'name', 'status'],
        defaultOrderBy: 'name',
        defaultSortOrder: 'asc',
        useThreeWaySort: false
      });
    });

    it('should set isAuthorised from localStorage', () => {
      mockLocalStorageService.get.and.returnValue(JSON.stringify(true));
      fixture.detectChanges();
      expect(component.isAuthorised).toBe(true);
    });
  });

  describe('Table Sorting', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle header click for name column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('name');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('name');
    });

    it('should handle header click for company column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('company');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('company');
    });

    it('should handle header click for firstName column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('firstName');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('firstName');
    });

    it('should toggle sort order on repeated header clicks', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('name');
      expect(sortingService.getCurrentSortOrder()).toBe('desc');

      component.onClickHeader('name');
      expect(sortingService.getCurrentSortOrder()).toBe('asc');
    });

    it('should get correct arrow for sorted column', () => {
      component.onClickHeader('name');
      expect(sortingService.getArrow('name')).toBe('↑');
    });

    it('should get empty arrow for non-sorted column', () => {
      component.onClickHeader('name');
      expect(sortingService.getArrow('company')).toBe('');
    });

    it('should pass current sort state to filter', () => {
      component.onClickHeader('company');
      spyOn(component as any, 'readPage').and.callThrough();

      (component as any).setFilter();

      expect(mockAllAddressStateService.prepareFilterForRequest).toHaveBeenCalledWith(
        'company',
        jasmine.any(String),
        component.page,
        component.firstItemOnLastPage,
        component.isPreviousPage,
        component.isNextPage
      );
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should navigate to new address on add button click', () => {
      component.onAddAddress();
      expect(mockNavigationService.navigateToEditAddress).toHaveBeenCalled();
    });

    it('should navigate to edit address with client id', () => {
      const mockClient = { id: '123', name: 'Test', firstName: 'User', company: '' };
      component.onClickEdit(mockClient as any);

      expect(mockAllAddressStateService.saveCurrentFilter).toHaveBeenCalled();
      expect(mockNavigationService.navigateToEditAddress).toHaveBeenCalledWith('123');
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle page change', () => {
      spyOn(component as any, 'readPage');
      component.page = 1;

      component.onPageChange(2);

      expect(component.isNextPage).toBe(true);
      expect(component.page).toBe(2);
    });

    it('should handle previous page', () => {
      spyOn(component as any, 'readPage');
      component.page = 2;

      component.onPageChange(1);

      expect(component.isPreviousPage).toBe(true);
      expect(component.page).toBe(1);
    });

    it('should update items per page', () => {
      spyOn(component as any, 'readPage');

      component.onItemsPerPageChange(20);

      expect(mockDataManagementClientService.currentFilter.numberOfItemsPerPage).toBe(20);
      expect((component as any).readPage).toHaveBeenCalled();
    });

    it('should not update items per page when search is active', () => {
      spyOn(component as any, 'readPage');
      mockDataManagementClientService.currentFilter.searchString = 'test';

      component.onItemsPerPageChange(20);

      expect((component as any).readPage).not.toHaveBeenCalled();
    });
  });

  describe('Checkbox Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle header checkbox change', () => {
      component.headerCheckBoxValue = true;
      component.onChangeHeaderCheckBox();

      expect(mockDataManagementClientService.clearCheckedArray).toHaveBeenCalled();
    });

    it('should update row checkbox value', () => {
      const mockClient = { id: '1', name: 'Test', firstName: 'User', company: '' };
      (mockDataManagementClientService.listWrapper as any).set({
        clients: [mockClient as any],
        editor: null,
        lastChange: null,
        maxItems: 1,
        maxPages: 1,
        firstItem: 0,
        lastItem: 0
      });
      const mockEvent = { currentTarget: { checked: true } };
      mockDataManagementClientService.findCheckBoxValue.and.returnValue({ id: '1', checked: false });

      component.onChangeCheckBox(0, mockEvent);

      expect(mockDataManagementClientService.findCheckBoxValue).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up on destroy', () => {
      fixture.detectChanges();

      component.ngOnDestroy();

      expect(mockAllAddressStateService.saveCurrentFilter).toHaveBeenCalled();
    });
  });
});
