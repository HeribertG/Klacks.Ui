// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ShiftQualificationsComponent } from './shift-qualifications.component';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataShiftQualificationService } from 'src/app/infrastructure/api/shift/data-shift-qualification.service';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';

describe('ShiftQualificationsComponent', () => {
  let component: ShiftQualificationsComponent;
  let fixture: ComponentFixture<ShiftQualificationsComponent>;
  let mockDataManagementShiftService: any;
  let mockQualificationService: any;
  let mockShiftQualificationService: any;

  const securityWork: IQualification = {
    id: 'q-security',
    name: { de: 'Sicherheitsdienst', en: 'Security' },
    emoji: '🛡️',
    isTimeLimited: false,
    type: QualificationType.Work,
    countries: ['CH'],
    category: QualificationCategory.Security,
  };
  const swissLanguage: IQualification = {
    id: 'q-lang',
    name: { de: 'Deutsch', en: 'German' },
    emoji: '🗣️',
    isTimeLimited: false,
    type: QualificationType.Language,
    countries: ['CH'],
    category: QualificationCategory.None,
  };

  beforeEach(async () => {
    mockDataManagementShiftService = {
      isReset: signal(false),
      isRead: signal(false),
      editShift: { id: 'shift-1' },
    };

    mockQualificationService = {
      getQualificationList: vi.fn().mockReturnValue(of([securityWork, swissLanguage])),
    };

    mockShiftQualificationService = {
      getByShiftId: vi.fn().mockReturnValue(of([])),
      setRequiredQualification: vi.fn().mockReturnValue(of('id')),
      deleteRequiredQualification: vi.fn().mockReturnValue(of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [ShiftQualificationsComponent, TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: DataManagementShiftService, useValue: mockDataManagementShiftService },
        { provide: DataQualificationService, useValue: mockQualificationService },
        { provide: DataShiftQualificationService, useValue: mockShiftQualificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShiftQualificationsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should still list languages after switching from a work category filter', () => {
    const row = { isMandatory: false, minLevel: 1 } as any;

    component.onFilterTypeChange(QualificationType.Work);
    component.onFilterCategoryChange(QualificationCategory.Security);
    component.onFilterCountryChange('CH');
    expect(component.availableQualifications(row).map((q) => q.id)).toEqual(['q-security']);

    component.onFilterTypeChange(QualificationType.Language);
    expect(component.filterCategory).toBeNull();
    expect(component.availableQualifications(row).map((q) => q.id)).toEqual(['q-lang']);
  });
});
