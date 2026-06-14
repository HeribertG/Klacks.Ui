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
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-class';

describe('ShiftQualificationsComponent', () => {
  let component: ShiftQualificationsComponent;
  let fixture: ComponentFixture<ShiftQualificationsComponent>;
  let mockDataManagementShiftService: any;
  let mockQualificationService: any;

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
      editShift: { id: 'shift-1', status: ShiftStatus.OriginalOrder, requiredQualifications: [] },
    };

    mockQualificationService = {
      getQualificationList: vi.fn().mockReturnValue(of([securityWork, swissLanguage])),
    };

    await TestBed.configureTestingModule({
      imports: [ShiftQualificationsComponent, TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: DataManagementShiftService, useValue: mockDataManagementShiftService },
        { provide: DataQualificationService, useValue: mockQualificationService },
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

  it('should add a row to the shift in-memory and emit a change instead of persisting immediately', () => {
    const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

    component.addRow();

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(1);
    expect(component.rows).toHaveLength(1);
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('should be disabled and not mutate the shift when status is not OriginalOrder', () => {
    mockDataManagementShiftService.editShift.status = ShiftStatus.SplitShift;
    const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

    expect(component.isDisabled()).toBe(true);

    component.addRow();

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(0);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should remove a row from the shift in-memory and emit a change', () => {
    component.addRow();
    const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

    component.removeRow(0);

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(0);
    expect(emitSpy).toHaveBeenCalledWith(true);
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
