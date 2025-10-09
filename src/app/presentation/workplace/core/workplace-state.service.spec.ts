import { TestBed } from '@angular/core/testing';
import { WorkplaceStateService } from './workplace-state.service';

describe('WorkplaceStateService', () => {
  let service: WorkplaceStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
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
