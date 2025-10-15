import { TestBed } from '@angular/core/testing';
import { WorkplaceStateService } from './workplace-state.service';
import { LOADING_INDICATOR_TOKEN } from 'src/app/domain/interfaces/loading-indicator.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';

describe('WorkplaceStateService', () => {
  let service: WorkplaceStateService;
  let mockLoadingIndicator: any;
  let mockRegistry: any;

  beforeEach(() => {
    mockLoadingIndicator = { showProgressSpinner: false };
    mockRegistry = {
      register: jasmine.createSpy('register'),
      get: jasmine.createSpy('get').and.returnValue(null),
      has: jasmine.createSpy('has').and.returnValue(false),
      clear: jasmine.createSpy('clear'),
      getRegisteredRoutes: jasmine.createSpy('getRegisteredRoutes').and.returnValue([])
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LOADING_INDICATOR_TOKEN, useValue: mockLoadingIndicator },
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: mockRegistry }
      ]
    });
    service = TestBed.inject(WorkplaceStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isDirty', () => {
    it('should return false initially', () => {
      expect(service.isDirty).toBe(false);
    });

    it('should update when set', () => {
      service.isDirty = true;
      expect(service.isDirty).toBe(true);
    });
  });

  describe('canSave', () => {
    it('should return false initially', () => {
      expect(service.canSave).toBe(false);
    });

    it('should update when set', () => {
      service.canSave = true;
      expect(service.canSave).toBe(true);
    });

    it('should be independent of isDirty', () => {
      service.isDirty = true;
      service.canSave = false;
      expect(service.isDirty).toBe(true);
      expect(service.canSave).toBe(false);
    });
  });

  describe('isDisabled', () => {
    it('should return false initially', () => {
      expect(service.isDisabled).toBe(false);
    });

    it('should update when set', () => {
      service.isDisabled = true;
      expect(service.isDisabled).toBe(true);
    });
  });
});
