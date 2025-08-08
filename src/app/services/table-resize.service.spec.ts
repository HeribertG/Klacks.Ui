import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TableResizeService } from './table-resize.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { MessageLibrary } from '../helpers/string-constants';

describe('TableResizeService', () => {
  let service: TableResizeService;
  let mockLocalStorageService: jasmine.SpyObj<LocalStorageService>;
  let mockTableElement: HTMLElement;
  let mockTable: HTMLTableElement;
  let mockTbody: HTMLTableSectionElement;

  beforeEach(() => {
    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['get', 'set']);
    
    TestBed.configureTestingModule({
      providers: [
        TableResizeService,
        { provide: LocalStorageService, useValue: localStorageSpy }
      ]
    });
    
    service = TestBed.inject(TableResizeService);
    mockLocalStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    
    // Mock DOM elements
    mockTbody = document.createElement('tbody');
    mockTable = document.createElement('table');
    mockTable.appendChild(mockTbody);
    mockTableElement = document.createElement('div');
    mockTableElement.appendChild(mockTable);
    
    // Mock window properties
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
  });

  describe('setRowHeights', () => {
    it('should set default row height', () => {
      service.setRowHeights(50);
      const result = service.calculateOptimalRowCount(mockTableElement);
      expect(result).toBeGreaterThan(0);
    });

    it('should set both default and min row heights', () => {
      service.setRowHeights(60, 45);
      const result = service.calculateOptimalRowCount(mockTableElement);
      expect(result).toBeGreaterThan(0);
    });

    it('should only set min height when default is undefined', () => {
      service.setRowHeights(undefined, 40);
      const result = service.calculateOptimalRowCount(mockTableElement);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('calculateOptimalRowCount', () => {
    beforeEach(() => {
      // Mock offsetTop
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 100, writable: true });
    });

    it('should calculate optimal row count with default values', () => {
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBeGreaterThanOrEqual(5); // MIN_ITEMS_PER_PAGE
      expect(result).toBeLessThan(50); // reasonable upper bound
    });

    it('should respect minimum items per page', () => {
      // Mock very small window
      Object.defineProperty(window, 'innerHeight', { value: 200, writable: true });
      
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBe(5); // Should return MIN_ITEMS_PER_PAGE
    });

    it('should respect maxItems constraint', () => {
      const maxItems = 3;
      const result = service.calculateOptimalRowCount(mockTableElement, maxItems);
      
      expect(result).toBe(maxItems);
    });

    it('should use actual row heights when available', () => {
      // Add mock rows to tbody
      for (let i = 0; i < 3; i++) {
        const row = document.createElement('tr');
        Object.defineProperty(row, 'clientHeight', { value: 80, writable: true });
        mockTbody.appendChild(row);
      }
      
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBeGreaterThan(0);
    });

    it('should use default height when no tbody rows exist', () => {
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBeGreaterThan(0);
    });

    it('should handle height variations correctly', () => {
      // Add rows with varying heights
      const heights = [40, 50, 120]; // Large variation
      heights.forEach(height => {
        const row = document.createElement('tr');
        Object.defineProperty(row, 'clientHeight', { value: height, writable: true });
        mockTbody.appendChild(row);
      });
      
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('localStorage integration', () => {
    it('should get saved row size from localStorage', () => {
      mockLocalStorageService.get.and.returnValue('10');
      
      const result = service.getSavedRowSize();
      
      expect(result).toBe(10);
      expect(mockLocalStorageService.get).toHaveBeenCalledWith(MessageLibrary.SELECTED_ROW_ORDER);
    });

    it('should return null for invalid saved row size', () => {
      mockLocalStorageService.get.and.returnValue('invalid');
      
      const result = service.getSavedRowSize();
      
      expect(result).toBeNull();
    });

    it('should save row size to localStorage', () => {
      service.saveRowSize(15);
      
      expect(mockLocalStorageService.set).toHaveBeenCalledWith(MessageLibrary.SELECTED_ROW_ORDER, '15');
    });
  });

  describe('auto mode detection', () => {
    it('should detect auto mode when value is -1', () => {
      const result = service.isAutoMode(-1);
      
      expect(result).toBe(true);
    });

    it('should detect auto mode when value is null', () => {
      const result = service.isAutoMode(null);
      
      expect(result).toBe(true);
    });

    it('should not be auto mode for positive values', () => {
      const result = service.isAutoMode(10);
      
      expect(result).toBe(false);
    });

    it('should check localStorage when no value provided', () => {
      mockLocalStorageService.get.and.returnValue('-1');
      
      const result = service.isAutoMode();
      
      expect(result).toBe(true);
    });
  });

  describe('effective row size', () => {
    it('should return calculated optimal rows in auto mode', () => {
      mockLocalStorageService.get.and.returnValue('-1');
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 100, writable: true });
      
      const result = service.getEffectiveRowSize(mockTableElement);
      
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it('should return saved value when not in auto mode', () => {
      mockLocalStorageService.get.and.returnValue('8');
      
      const result = service.getEffectiveRowSize(mockTableElement);
      
      expect(result).toBe(8);
    });

    it('should return calculated optimal when no saved value (auto mode)', () => {
      mockLocalStorageService.get.and.returnValue(null);
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 100, writable: true });
      
      const result = service.getEffectiveRowSize(mockTableElement);
      
      expect(result).toBeGreaterThanOrEqual(5); // Will calculate optimal since no saved value = auto mode
    });
  });

  describe('resize observables', () => {
    it('should create window resize observable', (done) => {
      const observable = service.createWindowResizeObservable();
      
      expect(observable).toBeDefined();
      
      const subscription = observable.subscribe(event => {
        expect(event).toBeDefined();
        subscription.unsubscribe();
        done();
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });

    it('should create table resize observable', (done) => {
      // Mock ResizeObserver
      const mockObserver = {
        observe: jasmine.createSpy('observe'),
        disconnect: jasmine.createSpy('disconnect')
      };
      
      spyOn(window, 'ResizeObserver').and.returnValue(mockObserver as any);
      
      const observable = service.createTableResizeObservable(mockTableElement);
      
      expect(observable).toBeDefined();
      
      const subscription = observable.subscribe();
      subscription.unsubscribe();
      
      expect(mockObserver.observe).toHaveBeenCalledWith(mockTableElement);
      
      done();
    });

    it('should create combined resize observable', (done) => {
      // Mock ResizeObserver
      const mockObserver = {
        observe: jasmine.createSpy('observe'),
        disconnect: jasmine.createSpy('disconnect')
      };
      
      spyOn(window, 'ResizeObserver').and.returnValue(mockObserver as any);
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 100, writable: true });
      
      const observable = service.createResizeObservable(mockTableElement, 10);
      
      expect(observable).toBeDefined();
      
      const subscription = observable.subscribe(optimalRows => {
        expect(typeof optimalRows).toBe('number');
        expect(optimalRows).toBeGreaterThan(0);
        subscription.unsubscribe();
        done();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle element without table child', () => {
      const divElement = document.createElement('div');
      Object.defineProperty(divElement, 'offsetTop', { value: 100, writable: true });
      
      const result = service.calculateOptimalRowCount(divElement);
      
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it('should handle custom row heights correctly', () => {
      service.setRowHeights(90, 82); // Double height for shift tables
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 200, writable: true });
      
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(20); // Should be less due to larger row height
    });

    it('should handle zero or negative window height gracefully', () => {
      Object.defineProperty(window, 'innerHeight', { value: 0, writable: true });
      Object.defineProperty(mockTableElement, 'offsetTop', { value: 100, writable: true });
      
      const result = service.calculateOptimalRowCount(mockTableElement);
      
      expect(result).toBe(5); // Should return minimum
    });
  });
});