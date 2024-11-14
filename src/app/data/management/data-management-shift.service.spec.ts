import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { DataManagementShiftService } from './data-management-shift.service';

describe('DataManagementShiftService', () => {
  let service: DataManagementShiftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule], // HttpClientModule hinzufügen
    });
    service = TestBed.inject(DataManagementShiftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
