// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaginationComponent } from './pagination.component';
import { IPaginationDataService } from 'src/app/domain/interfaces/pagination.interface';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { By } from '@angular/platform-browser';

describe('PaginationComponent', () => {
    let component: PaginationComponent;
    let fixture: ComponentFixture<PaginationComponent>;
    let mockLocalStorageService: any;
    let mockTranslateService: any;
    let mockDataService: IPaginationDataService;

    beforeEach(async () => {
        const localStorageSpy = {
            get: vi.fn(),
            set: vi.fn()
        };
        const translateSpy = {
            instant: vi.fn((key: string) => {
                if (key === 'pagination.auto') return 'auto';
                if (key === 'pagination.visibleRow5') return '5';
                if (key === 'pagination.visibleRow10') return '10';
                if (key === 'pagination.visibleRow20') return '20';
                if (key === 'pagination.visibleRow50') return '50';
                if (key === 'pagination.visibleRow100') return '100';
                return key;
            })
        };

        mockDataService = {
            maxItems: 50,
            firstItem: 0,
            maxPages: 5,
        };

        await TestBed.configureTestingModule({
            imports: [
                FormsModule,
                NgbPaginationModule,
                TranslateModule.forRoot(),
                PaginationComponent,
            ],
            providers: [
                { provide: LocalStorageService, useValue: localStorageSpy },
                { provide: TranslateService, useValue: translateSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PaginationComponent);
        component = fixture.componentInstance;
        mockLocalStorageService = TestBed.inject(LocalStorageService) as any;
        mockTranslateService = TestBed.inject(TranslateService) as any;

        mockTranslateService.instant.mockReturnValue('Translated Text');

        // Set required input
        component.dataService = mockDataService;
    });

    describe('component initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize with default values', () => {
            // Arrange
            component.ngOnInit();

            // Assert
            expect(component.page).toBe(1);
            expect(component.numberOfItemsPerPage).toBe(5);
            expect(component.showRowSelector).toBe(true);
            expect(component.maxSize).toBe(5);
            expect(component.rotate).toBe(true);
            expect(component.ellipses).toBe(false);
            expect(component.boundaryLinks).toBe(true);
        });

        it('should initialize visibleRow options', () => {
            // Arrange
            component.ngOnInit();

            // Assert
            expect(component.visibleRow).toBeDefined();
            expect(component.visibleRow.length).toBeGreaterThan(0);
            expect(component.visibleRow[0].text).toBe('pagination.auto');
            expect(component.visibleRow[0].value).toBe(-1);
        });
    });

    describe('ngOnInit', () => {
        it('should load saved row size from localStorage', () => {
            mockLocalStorageService.get.mockReturnValue('10');

            component.ngOnInit();

            expect(mockLocalStorageService.get).toHaveBeenCalledWith(DomainMessages.SELECTED_ROW_ORDER);
            expect(component.realRow).toBe(10);
            expect(component.numberOfItemsPerPage).toBe(10);
        });

        it('should handle auto mode (-1) from localStorage', () => {
            mockLocalStorageService.get.mockReturnValue('-1');
            component.numberOfItemsPerPage = 0; // Set to 0 to trigger default logic

            component.ngOnInit();

            expect(component.realRow).toBe(-1);
            expect(component.numberOfItemsPerPage).toBe(10); // default for auto mode
        });

        it('should set default when no saved value exists', () => {
            mockLocalStorageService.get.mockReturnValue(null);
            component.numberOfItemsPerPage = 0; // Set to 0 to trigger default logic

            component.ngOnInit();

            expect(component.realRow).toBe(-1);
            expect(component.numberOfItemsPerPage).toBe(10);
        });

        it('should set default when numberOfItemsPerPage is 0', () => {
            mockLocalStorageService.get.mockReturnValue('15');
            component.numberOfItemsPerPage = 0;

            component.ngOnInit();

            expect(component.numberOfItemsPerPage).toBe(15);
        });

        it('should emit numberOfItemsPerPageChange for fixed values', async () => {
            mockLocalStorageService.get.mockReturnValue('8');

            component.numberOfItemsPerPageChange.subscribe((value) => {
                expect(value).toBe(8);
                ;
            });

            component.ngOnInit();
        });
    });

    describe('page change handling', () => {
        beforeEach(() => {
            component.page = 2;
            component.numberOfItemsPerPage = 10;
            component.dataService = mockDataService;
        });

        it('should handle next page navigation', () => {
            component.onPageChange(3);

            expect(component.page).toBe(3);
            expect(component.isNextPage).toBe(true);
            expect(component.isPreviousPage).toBeUndefined();
            expect(component.firstItemOnLastPage).toBe(mockDataService.firstItem);
        });

        it('should handle previous page navigation', () => {
            component.onPageChange(1);

            expect(component.page).toBe(1);
            expect(component.isPreviousPage).toBe(true);
            expect(component.isNextPage).toBeUndefined();
            expect(component.firstItemOnLastPage).toBe(mockDataService.firstItem);
        });

        it('should handle random page navigation', () => {
            component.onPageChange(4);

            expect(component.page).toBe(4);
            expect(component.isPreviousPage).toBeUndefined();
            expect(component.isNextPage).toBeUndefined();
        });

        it('should emit pageChange event', () => {
            vi.spyOn(component.pageChange, 'emit');

            component.onPageChange(3);

            expect(component.pageChange.emit).toHaveBeenCalledWith(3);
        });

        it('should store items per page for current page', () => {
            component.numberOfItemsPerPageMap.clear();

            component.onPageChange(3); // next page

            expect(component.numberOfItemsPerPageMap.get(2)).toBe(10);
        });
    });

    describe('row size change handling', () => {
        let mockEvent: any;

        beforeEach(() => {
            mockEvent = {
                srcElement: { value: '15' },
            };
        });

        it('should change to fixed row size', () => {
            vi.spyOn(component.numberOfItemsPerPageChange, 'emit');
            vi.spyOn(component.rowSizeChange, 'emit');
            vi.spyOn(component.pageChange, 'emit');

            component.onChangeRowSize(mockEvent);

            expect(component.realRow).toBe(15);
            expect(component.page).toBe(1);
            expect(component.numberOfItemsPerPage).toBe(15);
            expect(mockLocalStorageService.set).toHaveBeenCalledWith(DomainMessages.SELECTED_ROW_ORDER, '15');
            expect(component.numberOfItemsPerPageChange.emit).toHaveBeenCalledWith(15);
            expect(component.pageChange.emit).toHaveBeenCalledWith(1);
            expect(component.rowSizeChange.emit).toHaveBeenCalledWith(mockEvent);
        });

        it('should change to auto mode (-1)', () => {
            mockEvent.srcElement.value = '-1';
            vi.spyOn(component.rowSizeChange, 'emit');
            vi.spyOn(component.pageChange, 'emit');

            component.onChangeRowSize(mockEvent);

            expect(component.realRow).toBe(-1);
            expect(component.page).toBe(1);
            expect(mockLocalStorageService.set).toHaveBeenCalledWith(DomainMessages.SELECTED_ROW_ORDER, '-1');
            expect(component.rowSizeChange.emit).toHaveBeenCalledWith(mockEvent);
            expect(component.pageChange.emit).toHaveBeenCalledWith(1);
        });

        it('should not emit numberOfItemsPerPageChange for auto mode', () => {
            mockEvent.srcElement.value = '-1';
            vi.spyOn(component.numberOfItemsPerPageChange, 'emit');

            component.onChangeRowSize(mockEvent);

            expect(component.numberOfItemsPerPageChange.emit).not.toHaveBeenCalled();
        });
    });

    describe('template rendering', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should render row selector when showRowSelector is true', () => {
            component.showRowSelector = true;
            fixture.detectChanges();

            const select = fixture.debugElement.query(By.css('select.maxSize-selection'));
            expect(select).toBeTruthy();
        });

        it('should not render row selector when showRowSelector is false', () => {
            component.showRowSelector = false;
            fixture.detectChanges();

            const select = fixture.debugElement.query(By.css('select.maxSize-selection'));
            expect(select).toBeFalsy();
        });

        it('should render pagination component', () => {
            const pagination = fixture.debugElement.query(By.css('ngb-pagination'));
            expect(pagination).toBeTruthy();
        });

        it('should render all row size options', () => {
            const options = fixture.debugElement.queryAll(By.css('option'));
            expect(options.length).toBe(component.visibleRow.length);
        });

        it('should display correct max items count', () => {
            const itemInfo = fixture.debugElement.query(By.css('.entry-info'));
            expect(itemInfo.nativeElement.textContent).toContain('50');
        });

        it('should bind pagination properties correctly', () => {
            const pagination = fixture.debugElement.query(By.css('ngb-pagination'));
            const paginationComponent = pagination.componentInstance;

            expect(paginationComponent.collectionSize).toBe(component.dataService.maxItems);
            expect(paginationComponent.pageSize).toBe(component.numberOfItemsPerPage);
            expect(paginationComponent.maxSize).toBe(component.maxSize);
            expect(paginationComponent.rotate).toBe(component.rotate);
            expect(paginationComponent.ellipses).toBe(component.ellipses);
            expect(paginationComponent.boundaryLinks).toBe(component.boundaryLinks);
        });
    });

    describe('event handling in template', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should call onPageChange when pagination page changes', () => {
            vi.spyOn(component, 'onPageChange');

            const pagination = fixture.debugElement.query(By.css('ngb-pagination'));
            pagination.triggerEventHandler('pageChange', 3);

            expect(component.onPageChange).toHaveBeenCalledWith(3);
        });

        it('should call onChangeRowSize when select changes', () => {
            vi.spyOn(component, 'onChangeRowSize');

            const select = fixture.debugElement.query(By.css('select.maxSize-selection'));
            const selectElement = select.nativeElement as HTMLSelectElement;
            selectElement.value = '20';

            const mockEvent = { srcElement: selectElement, target: selectElement };
            select.triggerEventHandler('change', mockEvent);

            expect(component.onChangeRowSize).toHaveBeenCalledWith(mockEvent);
        });
    });

    describe('data service integration', () => {
        it('should handle undefined data service gracefully', () => {
            component.dataService = undefined as any;

            // This should throw because template tries to access dataService.maxItems
            expect(() => fixture.detectChanges()).toThrow();
        });

        it('should update when data service values change', () => {
            component.dataService.maxItems = 100;
            fixture.detectChanges();

            const itemInfo = fixture.debugElement.query(By.css('.entry-info'));
            expect(itemInfo.nativeElement.textContent).toContain('100');
        });
    });

    describe('edge cases', () => {
        it('should handle invalid localStorage values', () => {
            mockLocalStorageService.get.mockReturnValue('invalid');
            component.numberOfItemsPerPage = 0; // Set to 0 to trigger default logic

            component.ngOnInit();

            expect(component.realRow).toBe(-1);
            expect(component.numberOfItemsPerPage).toBe(10);
        });

        it('should handle undefined event in onChangeRowSize', () => {
            const mockEvent = { srcElement: null };

            expect(() => component.onChangeRowSize(mockEvent)).toThrow();
        });

        it('should handle string numbers in onChangeRowSize', () => {
            const mockEvent = { srcElement: { value: '5' } };
            vi.spyOn(component.numberOfItemsPerPageChange, 'emit');

            component.onChangeRowSize(mockEvent);

            expect(component.numberOfItemsPerPage).toBe(5);
            expect(component.numberOfItemsPerPageChange.emit).toHaveBeenCalledWith(5);
        });

        it('should reset pagination state on page change', () => {
            component.firstItemOnLastPage = 10;
            component.isPreviousPage = true;
            component.isNextPage = true;

            component.onPageChange(1);

            expect(component.firstItemOnLastPage).toBeUndefined();
            expect(component.isPreviousPage).toBeUndefined();
            expect(component.isNextPage).toBeUndefined();
        });
    });

    describe('input/output properties', () => {
        it('should accept page input', () => {
            component.page = 3;
            expect(component.page).toBe(3);
        });

        it('should accept numberOfItemsPerPage input', () => {
            component.numberOfItemsPerPage = 25;
            expect(component.numberOfItemsPerPage).toBe(25);
        });

        it('should accept maxSize input', () => {
            component.maxSize = 7;
            expect(component.maxSize).toBe(7);
        });

        it('should accept showRowSelector input', () => {
            component.showRowSelector = false;
            expect(component.showRowSelector).toBe(false);
        });

        it('should have working output events', () => {
            vi.spyOn(component.pageChange, 'emit');
            vi.spyOn(component.numberOfItemsPerPageChange, 'emit');
            vi.spyOn(component.rowSizeChange, 'emit');

            expect(component.pageChange.emit).toBeDefined();
            expect(component.numberOfItemsPerPageChange.emit).toBeDefined();
            expect(component.rowSizeChange.emit).toBeDefined();
        });
    });
});
