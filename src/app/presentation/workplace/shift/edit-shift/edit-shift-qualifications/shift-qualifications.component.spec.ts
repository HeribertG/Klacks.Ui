// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';

describe('ShiftQualificationsComponent', () => {
  let component: ShiftQualificationsComponent;
  let fixture: ComponentFixture<ShiftQualificationsComponent>;
  let mockDataManagementShiftService: any;
  let mockQualificationService: any;
  let grantedPermissions: Set<string>;

  const securityWork: IQualification = {
    id: 'q-security',
    name: { de: 'Sicherheitsdienst', en: 'Security' },
    emoji: '🛡️',
    isTimeLimited: false,
    isLevelBinding: false,
    type: QualificationType.Work,
    countries: ['CH'],
    category: QualificationCategory.Security,
  };
  const swissLanguage: IQualification = {
    id: 'q-lang',
    name: { de: 'Deutsch', en: 'German' },
    emoji: '🗣️',
    isTimeLimited: false,
    isLevelBinding: false,
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

    grantedPermissions = new Set<string>([PERMISSIONS.CanEditShifts]);

    await TestBed.configureTestingModule({
      imports: [ShiftQualificationsComponent, TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: DataManagementShiftService, useValue: mockDataManagementShiftService },
        { provide: DataQualificationService, useValue: mockQualificationService },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => grantedPermissions.has(permission) },
        },
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

  it('should be disabled without CanEditShifts and not mutate the shift', () => {
    grantedPermissions.clear();
    const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

    expect(component.isDisabled()).toBe(true);

    component.addRow();

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(0);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should stay editable on a non-OriginalOrder shift for a holder of CanEditShifts', () => {
    mockDataManagementShiftService.editShift.status = ShiftStatus.SplitShift;

    expect(component.isDisabled()).toBe(false);

    component.addRow();

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(1);
  });

  it('should remove a row from the shift in-memory and emit a change', () => {
    component.addRow();
    const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

    component.removeRow(0);

    expect(mockDataManagementShiftService.editShift.requiredQualifications).toHaveLength(0);
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  describe('level binding choice', () => {
    const bindingSelect = (): HTMLSelectElement =>
      fixture.nativeElement.querySelector('#sqLevelBinding-0') as HTMLSelectElement;

    const choose = async (optionIndex: number): Promise<void> => {
      const select = bindingSelect();
      select.value = select.options[optionIndex].value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };

    const renderRow = async (): Promise<void> => {
      component.addRow();
      component.rows[0].qualificationId = securityWork.id;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('starts a new row at "as the qualification" (null)', () => {
      component.addRow();

      expect(component.rows[0].levelBindingOverride).toBeNull();
    });

    it('offers inherit, binding and hint only and writes null, true or false to the row', async () => {
      await renderRow();
      const emitSpy = vi.spyOn(component.isChangingEvent, 'emit');

      expect(bindingSelect().options).toHaveLength(3);

      await choose(1);
      expect(component.rows[0].levelBindingOverride).toBe(true);

      await choose(2);
      expect(component.rows[0].levelBindingOverride).toBe(false);

      await choose(0);
      expect(component.rows[0].levelBindingOverride).toBeNull();
      expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('keeps hint only (false) on the edited shift instead of collapsing it to null', () => {
      component.addRow();

      component.onLevelBindingChange(0, false);

      expect(mockDataManagementShiftService.editShift.requiredQualifications[0].levelBindingOverride).toBe(false);
    });

    it('names what "as the qualification" currently means', async () => {
      mockQualificationService.getQualificationList.mockReturnValue(
        of([{ ...securityWork, isLevelBinding: true }, swissLanguage]),
      );
      component.ngOnInit();
      await renderRow();

      expect(component.inheritedLevelBinding(component.rows[0])).toBe(true);
      expect(bindingSelect().options[0].textContent?.trim()).toBe(
        'shift.edit-shift.qualifications.level-binding.inherit-current',
      );
    });

    it('shows the plain inherit label while no qualification is chosen', async () => {
      component.addRow();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.inheritedLevelBinding(component.rows[0])).toBeUndefined();
      expect(bindingSelect().options[0].textContent?.trim()).toBe(
        'shift.edit-shift.qualifications.level-binding.inherit',
      );
    });
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
