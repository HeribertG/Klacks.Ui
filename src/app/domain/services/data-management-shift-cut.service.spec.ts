import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataManagementShiftCutService } from './data-management-shift-cut.service';
import { DataShiftCutsService } from 'src/app/infrastructure/api/data-shift-cuts.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { WorkTimeCalculationService } from 'src/app/services/work-time-calculation.service';

describe('DataManagementShiftCutService', () => {
  let service: DataManagementShiftCutService;
  let mockToastService: jasmine.SpyObj<ToastShowService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockDataShiftCutsService: jasmine.SpyObj<DataShiftCutsService>;

  beforeEach(() => {
    mockToastService = jasmine.createSpyObj('ToastShowService', ['showSuccess', 'showError']);
    mockNavigationService = jasmine.createSpyObj('NavigationService', ['navigateToCutShift']);
    mockDataShiftCutsService = jasmine.createSpyObj('DataShiftCutsService', ['getCutShiftList', 'addCuts', 'updateCuts']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ToastShowService, useValue: mockToastService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: DataShiftCutsService, useValue: mockDataShiftCutsService },
        WorkTimeCalculationService
      ]
    });
    service = TestBed.inject(DataManagementShiftCutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should implement IManageable interface', () => {
    expect(service.save).toBeDefined();
    expect(service.resetData).toBeDefined();
    expect(service.goBack).toBeDefined();
    expect(service.areObjectsDirty).toBeDefined();
  });

  describe('goBack', () => {
    it('should return correct path', () => {
      const result = service.goBack();
      expect(result).toBe('/workplace/shift');
    });
  });
});