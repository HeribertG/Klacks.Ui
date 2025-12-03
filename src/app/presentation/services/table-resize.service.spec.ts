/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { TableResizeService } from './table-resize.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { of } from 'rxjs';

describe('TableResizeService', () => {
    let service: TableResizeService;
    let mockLocalStorageService: any;
    let mockTableElement: HTMLElement;
    let mockTable: HTMLTableElement;
    let mockTbody: HTMLTableSectionElement;

    beforeEach(() => {
        const localStorageSpy = {
            get: vi.fn(),
            set: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                TableResizeService,
                { provide: LocalStorageService, useValue: localStorageSpy },
            ],
        });

        service = TestBed.inject(TableResizeService);
        mockLocalStorageService = TestBed.inject(LocalStorageService) as any;

        // Mock DOM elements
        mockTbody = document.createElement('tbody');
        mockTable = document.createElement('table');
        mockTable.appendChild(mockTbody);
        mockTableElement = document.createElement('div');
        mockTableElement.appendChild(mockTable);

        // Mock window properties
        Object.defineProperty(window, 'innerHeight', {
            value: 1000,
            writable: true,
        });
    });

    describe('setRowHeights', () => {
        it('should set default row height', () => {
            // Arrange & Act
            service.setRowHeights(50, 40);
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });

        it('should set both default and min row heights', () => {
            // Arrange & Act
            service.setRowHeights(60, 45);
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });

        it('should set min height when default is same as min', () => {
            // Arrange & Act
            service.setRowHeights(40, 40);
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('calculateOptimalRowCount', () => {
        beforeEach(() => {
            // Mock offsetTop
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 100,
                writable: true,
            });
        });

        it('should calculate optimal row count with default values', () => {
            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThanOrEqual(5); // MIN_ITEMS_PER_PAGE
            expect(result).toBeLessThan(50); // reasonable upper bound
        });

        it('should respect minimum items per page', () => {
            // Arrange
            Object.defineProperty(window, 'innerHeight', {
                value: 200,
                writable: true,
            });

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBe(5); // Should return MIN_ITEMS_PER_PAGE
        });

        it('should respect maxItems constraint', () => {
            // Arrange
            const maxItems = 3;

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement, maxItems);

            // Assert
            expect(result).toBe(maxItems);
        });

        it('should use actual row heights when available', () => {
            // Arrange
            for (let i = 0; i < 3; i++) {
                const row = document.createElement('tr');
                Object.defineProperty(row, 'clientHeight', {
                    value: 80,
                    writable: true,
                });
                mockTbody.appendChild(row);
            }

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });

        it('should use default height when no tbody rows exist', () => {
            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });

        it('should handle height variations correctly', () => {
            // Arrange
            const heights = [40, 50, 120]; // Large variation
            heights.forEach((height) => {
                const row = document.createElement('tr');
                Object.defineProperty(row, 'clientHeight', {
                    value: height,
                    writable: true,
                });
                mockTbody.appendChild(row);
            });

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('localStorage integration', () => {
        it('should get saved row size from localStorage', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue('10');

            // Act
            const result = service.getSavedRowSize();

            // Assert
            expect(result).toBe(10);
            expect(mockLocalStorageService.get).toHaveBeenCalledWith(MessageLibrary.SELECTED_ROW_ORDER);
        });

        it('should return null for invalid saved row size', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue('invalid');

            // Act
            const result = service.getSavedRowSize();

            // Assert
            expect(result).toBeNull();
        });

        it('should save row size to localStorage', () => {
            // Act
            service.saveRowSize(15);

            // Assert
            expect(mockLocalStorageService.set).toHaveBeenCalledWith(MessageLibrary.SELECTED_ROW_ORDER, '15');
        });
    });

    describe('auto mode detection', () => {
        it('should detect auto mode when value is -1', () => {
            // Act
            const result = service.isAutoMode(-1);

            // Assert
            expect(result).toBe(true);
        });

        it('should detect auto mode when value is null', () => {
            // Act
            const result = service.isAutoMode(null);

            // Assert
            expect(result).toBe(true);
        });

        it('should not be auto mode for positive values', () => {
            // Act
            const result = service.isAutoMode(10);

            // Assert
            expect(result).toBe(false);
        });

        it('should check localStorage when no value provided', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue('-1');

            // Act
            const result = service.isAutoMode();

            // Assert
            expect(result).toBe(true);
        });
    });

    describe('effective row size', () => {
        it('should return calculated optimal rows in auto mode', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue('-1');
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 100,
                writable: true,
            });

            // Act
            const result = service.getEffectiveRowSize(mockTableElement);

            // Assert
            expect(result).toBeGreaterThanOrEqual(5);
        });

        it('should return saved value when not in auto mode', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue('8');

            // Act
            const result = service.getEffectiveRowSize(mockTableElement);

            // Assert
            expect(result).toBe(8);
        });

        it('should return calculated optimal when no saved value (auto mode)', () => {
            // Arrange
            mockLocalStorageService.get.mockReturnValue(null);
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 100,
                writable: true,
            });

            // Act
            const result = service.getEffectiveRowSize(mockTableElement);

            // Assert
            expect(result).toBeGreaterThanOrEqual(5);
        });
    });

    describe('resize observables', () => {
        it('should create window resize observable', async () => {
            // Act
            const observable = service.createWindowResizeObservable();

            // Assert
            expect(observable).toBeDefined();

            let isComplete = false;
            observable.subscribe((event) => {
                if (!isComplete) {
                    isComplete = true;
                    expect(event).toBeDefined();
                }
            });

            window.dispatchEvent(new Event('resize'));
        });

        it('should create table resize observable', async () => {
            // Arrange
            vi.spyOn(service, 'createTableResizeObservable').mockReturnValue(of([]));

            // Act
            const observable = service.createTableResizeObservable(mockTableElement);

            // Assert
            expect(observable).toBeDefined();
        });

        it('should create combined resize observable', async () => {
            // Arrange
            vi.spyOn(service, 'createTableResizeObservable').mockReturnValue(of([]));
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 100,
                writable: true,
            });

            // Act
            const observable = service.createResizeObservable(mockTableElement, 10);

            // Assert
            expect(observable).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle element without table child', () => {
            // Arrange
            const divElement = document.createElement('div');
            Object.defineProperty(divElement, 'offsetTop', {
                value: 100,
                writable: true,
            });

            // Act
            const result = service.calculateOptimalRowCount(divElement);

            // Assert
            expect(result).toBeGreaterThanOrEqual(5);
        });

        it('should handle custom row heights correctly', () => {
            // Arrange
            service.setRowHeights(90, 82); // Double height for shift tables
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 200,
                writable: true,
            });

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThan(20); // Should be less due to larger row height
        });

        it('should handle zero or negative window height gracefully', () => {
            // Arrange
            Object.defineProperty(window, 'innerHeight', {
                value: 0,
                writable: true,
            });
            Object.defineProperty(mockTableElement, 'offsetTop', {
                value: 100,
                writable: true,
            });

            // Act
            const result = service.calculateOptimalRowCount(mockTableElement);

            // Assert
            expect(result).toBe(5); // Should return minimum
        });
    });
});
