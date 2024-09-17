import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AbsenceGanttMaskComponent } from './absence-gantt-mask.component';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';

describe('AbsenceGanttMaskComponent', () => {
  let component: AbsenceGanttMaskComponent;
  let fixture: ComponentFixture<AbsenceGanttMaskComponent>;
  let translateService: TranslateService;
  let dataManagementAbsenceGanttService: DataManagementAbsenceGanttService;
  let dataManagementBreakService: DataManagementBreakService;

  beforeEach(async () => {
    // Mock services or dependencies
    const translateServiceMock = {
      onLangChange: of({}),
      currentLang: 'en',
    };
    const dataManagementAbsenceGanttServiceMock = {
      // Mock necessary properties and methods
    };
    const dataManagementBreakServiceMock = {
      // Mock necessary properties and methods
    };

    await TestBed.configureTestingModule({
      declarations: [AbsenceGanttMaskComponent],
      providers: [
        {
          provide: TranslateService,
          useValue: translateServiceMock,
        },
        {
          provide: DataManagementAbsenceGanttService,
          useValue: dataManagementAbsenceGanttServiceMock,
        },
        {
          provide: DataManagementBreakService,
          useValue: dataManagementBreakServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AbsenceGanttMaskComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    dataManagementAbsenceGanttService = TestBed.inject(
      DataManagementAbsenceGanttService
    );
    dataManagementBreakService = TestBed.inject(DataManagementBreakService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial currentLang as "de"', () => {
    expect(component.currentLang).toEqual('de');
  });

  // Add additional test cases as per your component methods and functionality
});
