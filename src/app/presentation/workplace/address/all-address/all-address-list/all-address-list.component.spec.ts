// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllAddressListComponent } from './all-address-list.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { TableResizeService } from 'src/app/presentation/services/table-resize.service';
import { AllAddressStateService } from '../services/all-address-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { AssistantPageContextService } from 'src/app/domain/services/assistant/assistant-page-context.service';
import { LOADING_INDICATOR_TOKEN, ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { FILTER_STORAGE_TOKEN } from 'src/app/application/interfaces/filter-storage.interface';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { ModalType } from 'src/app/presentation/modal/modal.service';

const ALL_ADDRESS_LIST_MODAL_CONTEXT = 'all-address-list';

describe('AllAddressListComponent', () => {
    let component: AllAddressListComponent;
    let fixture: ComponentFixture<AllAddressListComponent>;
    let mockDataManagementClientService: any;
    let mockAuthorizationService: any;
    let grantedPermissions: Set<string>;
    let mockLocalStorageService: any;
    let mockModalService: any;
    let modalResultEvent: Subject<ModalType>;
    let mockTableResizeService: any;
    let mockAllAddressStateService: any;
    let mockNavigationService: any;
    let mockLoadingIndicator: ILoadingIndicator;
    let mockRegistry: any;
    let mockFilterStorage: any;
    let sortingService: TableSortingService;

    beforeEach(async () => {
        mockDataManagementClientService = {
            readPage: vi.fn(),
            deleteClient: vi.fn(),
            exportExcel: vi.fn(),
            findCheckBoxValue: vi.fn(),
            addCheckBoxValueToArray: vi.fn(),
            removeCheckBoxValueToArray: vi.fn(),
            clearCheckedArray: vi.fn(),
            checkBoxIndeterminate: vi.fn(),
            getLastChangeMetaData: vi.fn(),
            subTitleLastChangesAllAddress: vi.fn(),
            listWrapper: signal({ clients: [] }),
            currentFilter: { numberOfItemsPerPage: 10, searchString: '', orderBy: 'name', sortOrder: 'asc', requiredPage: 0 },
            paginationDataService: signal({ maxItems: 100, firstItem: 0 }),
            headerCheckBoxValue: signal(false),
            isRead: signal(false),
            initIsRead: signal(false),
            clientListService: {
                headerCheckBoxValue: signal(false),
                checkedArray: signal([])
            },
            clientAttribute: []
        };

        grantedPermissions = new Set([
            PERMISSIONS.CanCreateClients,
            PERMISSIONS.CanEditClients,
            PERMISSIONS.CanDeleteClients,
        ]);
        mockAuthorizationService = {
            hasPermission: (p: string) => grantedPermissions.has(p),
            hasAnyPermission: (...p: string[]) => p.some((x) => grantedPermissions.has(x)),
        };

        mockLocalStorageService = {
            get: vi.fn(),
            set: vi.fn()
        };
        modalResultEvent = new Subject<ModalType>();
        mockModalService = {
            openModel: vi.fn(),
            setDefault: vi.fn(),
            componentContext: '',
            Filing: '',
            resultEvent: modalResultEvent
        };
        mockTableResizeService = {
            calculateOptimalRowCount: vi.fn(),
            createResizeObservable: vi.fn(),
            isAutoMode: vi.fn()
        };
        mockAllAddressStateService = {
            saveCurrentFilter: vi.fn(),
            prepareFilterForRequest: vi.fn(),
            restoreFilterFromStorage: vi.fn(),
            isResizeCalculationAllowed: vi.fn()
        };
        mockNavigationService = {
            navigateToEditAddress: vi.fn()
        };

        mockLoadingIndicator = {
            showProgressSpinner: false,
            interceptorSuppressed: false
        };

        mockRegistry = {
            register: vi.fn(),
            unregister: vi.fn()
        };

        mockFilterStorage = {
            saveFilter: vi.fn(),
            restoreFilter: vi.fn(),
            removeFilter: vi.fn(),
            isAvailable: vi.fn(),
            getKeys: vi.fn(),
            clear: vi.fn()
        };
        mockFilterStorage.saveFilter.mockReturnValue(Promise.resolve(true));
        mockFilterStorage.restoreFilter.mockReturnValue(Promise.resolve(null));
        mockFilterStorage.removeFilter.mockReturnValue(Promise.resolve(true));
        mockFilterStorage.isAvailable.mockReturnValue(Promise.resolve(true));
        mockFilterStorage.getKeys.mockReturnValue(Promise.resolve([]));
        mockFilterStorage.clear.mockReturnValue(Promise.resolve(true));

        mockLocalStorageService.get.mockReturnValue(null);
        mockTableResizeService.createResizeObservable.mockReturnValue(of(10));
        mockTableResizeService.isAutoMode.mockReturnValue(false);
        mockAllAddressStateService.restoreFilterFromStorage.mockReturnValue(Promise.resolve(false));
        mockAllAddressStateService.isResizeCalculationAllowed.mockReturnValue(true);
        mockDataManagementClientService.deleteClient.mockReturnValue(of(null as any));
        mockDataManagementClientService.subTitleLastChangesAllAddress.mockReturnValue('Last changes');

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
                { provide: AssistantPageContextService, useValue: { setSelectedClients: vi.fn() } },
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
        it('should initialize TableSortingService with correct config', () => {
            vi.spyOn(sortingService, 'initialize');
            fixture.detectChanges();

            expect(sortingService.initialize).toHaveBeenCalledWith({
                columns: ['idNumber', 'company', 'firstName', 'name', 'status'],
                defaultOrderBy: 'name',
                defaultSortOrder: 'asc',
                useThreeWaySort: false
            });
        });

    });

    describe('Table Sorting', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should handle header click for name column', () => {
            vi.spyOn(component as any, 'readPage');

            component.onClickHeader('name');

            expect((component as any).readPage).toHaveBeenCalled();
            expect(sortingService.getCurrentOrderBy()).toBe('name');
        });

        it('should handle header click for company column', () => {
            vi.spyOn(component as any, 'readPage');

            component.onClickHeader('company');

            expect((component as any).readPage).toHaveBeenCalled();
            expect(sortingService.getCurrentOrderBy()).toBe('company');
        });

        it('should handle header click for firstName column', () => {
            vi.spyOn(component as any, 'readPage');

            component.onClickHeader('firstName');

            expect((component as any).readPage).toHaveBeenCalled();
            expect(sortingService.getCurrentOrderBy()).toBe('firstName');
        });

        it('should toggle sort order on repeated header clicks', () => {
            vi.spyOn(component as any, 'readPage');

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
            vi.spyOn(component as any, 'readPage');

            (component as any).setFilter();

            expect(mockAllAddressStateService.prepareFilterForRequest).toHaveBeenCalledWith('company', expect.any(String), component.page, component.firstItemOnLastPage, component.isPreviousPage, component.isNextPage);
        });
    });

    describe('Permission gating', () => {
        it('shows the new-address button for the Supervisor role, which holds CanCreateClients', () => {
            fixture.detectChanges();
            const button = fixture.nativeElement.querySelector('#new-address-button');
            expect(button).toBeTruthy();
        });

        it('hides the new-address button for the Planer role, which lacks CanCreateClients', () => {
            grantedPermissions.clear();
            fixture.detectChanges();
            const button = fixture.nativeElement.querySelector('#new-address-button');
            expect(button).toBeFalsy();
        });

        it('deletes the client once the delete modal is confirmed by a user holding CanDeleteClients', () => {
            fixture.detectChanges();
            mockModalService.componentContext = ALL_ADDRESS_LIST_MODAL_CONTEXT;
            mockModalService.Filing = 'client-1';

            modalResultEvent.next(ModalType.Delete);

            expect(mockDataManagementClientService.deleteClient).toHaveBeenCalledWith('client-1');
        });

        it('refuses the delete even on a confirmed modal when CanDeleteClients is missing', () => {
            grantedPermissions.clear();
            fixture.detectChanges();
            mockModalService.componentContext = ALL_ADDRESS_LIST_MODAL_CONTEXT;
            mockModalService.Filing = 'client-1';

            modalResultEvent.next(ModalType.Delete);

            expect(mockDataManagementClientService.deleteClient).not.toHaveBeenCalled();
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
            vi.spyOn(component as any, 'readPage');
            component.page = 1;

            component.onPageChange(2);

            expect(component.isNextPage).toBe(true);
            expect(component.page).toBe(2);
        });

        it('should handle previous page', () => {
            vi.spyOn(component as any, 'readPage');
            component.page = 2;

            component.onPageChange(1);

            expect(component.isPreviousPage).toBe(true);
            expect(component.page).toBe(1);
        });

        it('should update items per page', () => {
            vi.spyOn(component as any, 'readPage');

            component.onItemsPerPageChange(20);

            expect(mockDataManagementClientService.currentFilter.numberOfItemsPerPage).toBe(20);
            expect((component as any).readPage).toHaveBeenCalled();
        });

        it('should not update items per page when search is active', () => {
            vi.spyOn(component as any, 'readPage');
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
            const mockEvent = { target: { checked: true } } as unknown as Event;
            component.onChangeHeaderCheckBox(mockEvent);

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

            component.onChangeCheckBox(0, mockEvent);

            expect(mockDataManagementClientService.removeCheckBoxValueToArray).toHaveBeenCalledWith('1');
            expect(mockDataManagementClientService.addCheckBoxValueToArray).toHaveBeenCalledWith(
                expect.objectContaining({ id: '1', checked: true }),
            );
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
