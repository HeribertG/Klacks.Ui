/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllGroupListComponent } from './all-group-list.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { AllGroupStateService } from '../services/all-group-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { LOADING_INDICATOR_TOKEN, ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN, IManageableServiceRegistry } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { FILTER_STORAGE_TOKEN, IFilterStorage } from 'src/app/application/interfaces/filter-storage.interface';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('AllGroupListComponent', () => {
  let component: AllGroupListComponent;
  let fixture: ComponentFixture<AllGroupListComponent>;
  let mockDataManagementGroupService: jasmine.SpyObj<DataManagementGroupService>;
  let mockLocalStorageService: jasmine.SpyObj<LocalStorageService>;
  let mockModalService: jasmine.SpyObj<ModalService>;
  let mockTableResizeService: jasmine.SpyObj<TableResizeService>;
  let mockAllGroupStateService: jasmine.SpyObj<AllGroupStateService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockLoadingIndicator: ILoadingIndicator;
  let mockRegistry: jasmine.SpyObj<IManageableServiceRegistry>;
  let mockFilterStorage: jasmine.SpyObj<IFilterStorage>;
  let sortingService: TableSortingService;

  beforeEach(async () => {
    mockDataManagementGroupService = jasmine.createSpyObj('DataManagementGroupService', [
      'init',
      'readPage',
      'deleteGroup',
      'createGroup',
      'prepareGroup',
      'findCheckBoxValue',
      'addCheckBoxValueToArray',
      'clearCheckedArray',
      'checkBoxIndeterminate'
    ], {
      listWrapper: signal({ groups: [] }),
      currentFilter: { numberOfItemsPerPage: 10, searchString: '', orderBy: 'name', sortOrder: 'asc', requiredPage: 0 },
      paginationDataService: signal({ maxItems: 100, firstItem: 0 }),
      headerCheckBoxValue: signal(false),
      isRead: signal(false),
      initIsRead: signal(false),
      groupListService: {
        headerCheckBoxValue: signal(false)
      }
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
    mockAllGroupStateService = jasmine.createSpyObj('AllGroupStateService', [
      'saveCurrentFilter',
      'prepareFilterForRequest',
      'restoreFilterFromStorage',
      'isResizeCalculationAllowed',
      'initializeWorkplaceState'
    ]);
    mockNavigationService = jasmine.createSpyObj('NavigationService', [
      'navigateToEditGroup'
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
    mockAllGroupStateService.restoreFilterFromStorage.and.returnValue(Promise.resolve(false));
    mockAllGroupStateService.isResizeCalculationAllowed.and.returnValue(true);
    mockDataManagementGroupService.deleteGroup.and.returnValue(of(null as any));

    await TestBed.configureTestingModule({
      imports: [AllGroupListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGroupService, useValue: mockDataManagementGroupService },
        { provide: LocalStorageService, useValue: mockLocalStorageService },
        { provide: ModalService, useValue: mockModalService },
        { provide: TableResizeService, useValue: mockTableResizeService },
        { provide: AllGroupStateService, useValue: mockAllGroupStateService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: LOADING_INDICATOR_TOKEN, useValue: mockLoadingIndicator },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry },
        { provide: FILTER_STORAGE_TOKEN, useValue: mockFilterStorage },
        TableSortingService
      ]
    })
    .overrideComponent(AllGroupListComponent, {
      set: {
        providers: [
          { provide: TableResizeService, useValue: mockTableResizeService },
          { provide: AllGroupStateService, useValue: mockAllGroupStateService },
          TableSortingService
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllGroupListComponent);
    component = fixture.componentInstance;
    sortingService = component.sortingService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize DataManagementGroupService', () => {
      fixture.detectChanges();
      expect(mockDataManagementGroupService.init).toHaveBeenCalled();
    });

    it('should initialize AllGroupStateService', () => {
      fixture.detectChanges();
      expect(mockAllGroupStateService.initializeWorkplaceState).toHaveBeenCalled();
    });

    it('should initialize TableSortingService with correct config', () => {
      spyOn(sortingService, 'initialize');
      fixture.detectChanges();

      expect(sortingService.initialize).toHaveBeenCalledWith({
        columns: ['name', 'description', 'valid_from', 'valid_until'],
        defaultOrderBy: 'name',
        defaultSortOrder: 'asc',
        useThreeWaySort: true
      });
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

    it('should handle header click for description column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('description');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('description');
    });

    it('should handle header click for valid_from column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('valid_from');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('valid_from');
    });

    it('should handle header click for valid_until column', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('valid_until');

      expect((component as any).readPage).toHaveBeenCalled();
      expect(sortingService.getCurrentOrderBy()).toBe('valid_until');
    });

    it('should cycle through three-way sort: asc -> desc -> none', () => {
      spyOn(component as any, 'readPage');

      component.onClickHeader('description');
      expect(sortingService.getCurrentSortOrder()).toBe('asc');

      component.onClickHeader('description');
      expect(sortingService.getCurrentSortOrder()).toBe('desc');

      component.onClickHeader('description');
      expect(sortingService.getCurrentSortOrder()).toBe('');
    });

    it('should get correct arrow for sorted column', () => {
      component.onClickHeader('description');
      expect(sortingService.getArrow('description')).toBe('↓');
    });

    it('should get empty arrow for non-sorted column', () => {
      component.onClickHeader('name');
      expect(sortingService.getArrow('description')).toBe('');
    });

    it('should pass current sort state to filter', () => {
      component.onClickHeader('description');
      spyOn(component as any, 'readPage').and.callThrough();

      (component as any).setFilter();

      expect(mockAllGroupStateService.prepareFilterForRequest).toHaveBeenCalledWith(
        'description',
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

    it('should create new group on add button click', () => {
      component.onAddGroup();
      expect(mockDataManagementGroupService.createGroup).toHaveBeenCalled();
    });

    it('should navigate to edit group with group id', () => {
      const mockGroup = {
        id: '123',
        name: 'Test Group',
        description: 'Test',
        validFrom: new Date(),
        groupItems: [],
        lft: 0,
        rgt: 0,
        depth: 0,
        clientsCount: 0
      };
      component.onClickEdit(mockGroup as any);

      expect(mockAllGroupStateService.saveCurrentFilter).toHaveBeenCalled();
      expect(mockDataManagementGroupService.prepareGroup).toHaveBeenCalledWith(mockGroup);
      expect(mockNavigationService.navigateToEditGroup).toHaveBeenCalledWith('123');
    });

    it('should emit switchToTree event on toggle click', () => {
      spyOn(component.switchToTree, 'emit');

      component.onClickToggle();

      expect(component.switchToTree.emit).toHaveBeenCalled();
    });
  });

  describe('Copy Group', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should copy group with modified properties', () => {
      const mockGroup = {
        id: '123',
        name: 'Original',
        description: 'Test',
        validFrom: new Date(),
        groupItems: [
          { id: 'item1', groupId: '123', clientId: 'client1' }
        ],
        lft: 0,
        rgt: 0,
        depth: 0,
        clientsCount: 1
      };

      component.onCopyGroup(mockGroup as any);

      expect(mockAllGroupStateService.saveCurrentFilter).toHaveBeenCalled();
      expect(mockDataManagementGroupService.prepareGroup).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: '',
          name: 'Original-copy'
        })
      );
      expect(mockNavigationService.navigateToEditGroup).toHaveBeenCalled();
    });

    it('should reset groupItem ids when copying', () => {
      const mockGroup = {
        id: '123',
        name: 'Test',
        description: 'Test',
        validFrom: new Date(),
        groupItems: [
          { id: 'item1', groupId: '123', clientId: 'client1' }
        ],
        lft: 0,
        rgt: 0,
        depth: 0,
        clientsCount: 1
      };

      component.onCopyGroup(mockGroup as any);

      const prepareCall = mockDataManagementGroupService.prepareGroup.calls.mostRecent();
      const copiedGroup = prepareCall.args[0];

      expect(copiedGroup.groupItems[0].id).toBeUndefined();
      expect(copiedGroup.groupItems[0].groupId).toBeUndefined();
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

      expect(mockDataManagementGroupService.currentFilter.numberOfItemsPerPage).toBe(20);
      expect((component as any).readPage).toHaveBeenCalled();
    });

    it('should not update items per page when search is active', () => {
      spyOn(component as any, 'readPage');
      mockDataManagementGroupService.currentFilter.searchString = 'test';

      component.onItemsPerPageChange(20);

      expect((component as any).readPage).not.toHaveBeenCalled();
    });
  });

  describe('Checkbox Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle header checkbox change', () => {
      component.onChangeHeaderCheckBox();

      expect(mockDataManagementGroupService.clearCheckedArray).toHaveBeenCalled();
    });

    it('should update row checkbox value', () => {
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        description: 'Test',
        validFrom: new Date(),
        groupItems: [],
        lft: 0,
        rgt: 0,
        depth: 0,
        clientsCount: 0
      };
      const mockListWrapper = {
        groups: [mockGroup as any],
        editor: null,
        lastChange: null,
        maxItems: 1,
        maxPages: 1,
        firstItem: 0,
        lastItem: 0
      };
      (mockDataManagementGroupService.listWrapper as any).set(mockListWrapper);
      Object.defineProperty(mockDataManagementGroupService, 'listWrapper', {
        get: () => mockListWrapper
      });
      const mockEvent = { currentTarget: { checked: true } };
      mockDataManagementGroupService.findCheckBoxValue.and.returnValue({ id: '1', checked: false });

      component.onChangeCheckBox(0, mockEvent);

      expect(mockDataManagementGroupService.findCheckBoxValue).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up on destroy', () => {
      fixture.detectChanges();

      component.ngOnDestroy();

      expect(mockAllGroupStateService.saveCurrentFilter).toHaveBeenCalled();
    });
  });
});
