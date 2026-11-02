// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ShiftFormService } from '../services/shift-form.service';
import { EditShiftItemComponent } from './edit-shift-item.component';

describe('EditShiftItemComponent status control', () => {
  const KEY_TOKEN = 'key-token';

  const renderLockButton = (editShift: Partial<IShift>): Element | null => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: {
            editShift,
            isReset: signal(false),
            isRead: signal(false),
            makeValidation: signal(false),
            isCurrentShiftStatusLocked: () => false,
            hasStoredUntilDate: () => false,
            isEndDateOpen: () => false,
          },
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => true } },
        { provide: ShiftFormService, useValue: { shiftForm: () => undefined } },
        { provide: LocalStorageService, useValue: { get: () => null, set: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(EditShiftItemComponent);
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement).querySelector('#shift-lock-btn');
  };

  it('offers no status change on the sealed order of the active key, the server refuses one', () => {
    expect(renderLockButton({ id: 'shift-1', status: ShiftStatus.SealedOrder, analyseToken: KEY_TOKEN })).toBeNull();
  });

  it('offers sealing on an OriginalOrder, so the check above looks at the real button', () => {
    expect(renderLockButton({ id: 'shift-1', status: ShiftStatus.OriginalOrder })).not.toBeNull();
  });
});

describe('EditShiftItemComponent isFieldsDisabled', () => {
  let writeAllowed: boolean;
  let statusLocked: boolean;

  const createFixture = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: {
            editShift: {},
            isReset: signal(false),
            isRead: signal(false),
            isCurrentShiftStatusLocked: () => statusLocked,
          },
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => writeAllowed } },
        { provide: ShiftFormService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(EditShiftItemComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(EditShiftItemComponent);
  };

  beforeEach(() => {
    writeAllowed = true;
    statusLocked = false;
  });

  it('keeps the fields enabled with the write right on a shift without a status lock', () => {
    expect(createFixture().componentInstance.isFieldsDisabled).toBe(false);
  });

  it('disables the fields on a status lock', () => {
    statusLocked = true;

    expect(createFixture().componentInstance.isFieldsDisabled).toBe(true);
  });

  it('keeps them disabled for a planner without the write right', () => {
    writeAllowed = false;

    expect(createFixture().componentInstance.isFieldsDisabled).toBe(true);
  });

  it('keeps them disabled on a read-only link', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('isReadOnly', true);

    expect(fixture.componentInstance.isFieldsDisabled).toBe(true);
  });
});

describe('EditShiftItemComponent until date field', () => {
  let writeAllowed: boolean;
  let statusLocked: boolean;
  let storedUntilDate: boolean;
  let endDateOpen: boolean;

  const createFixture = () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataManagementShiftService,
          useValue: {
            editShift: {},
            isReset: signal(false),
            isRead: signal(false),
            isCurrentShiftStatusLocked: () => statusLocked,
            hasStoredUntilDate: () => storedUntilDate,
            isEndDateOpen: () => endDateOpen,
          },
        },
        { provide: AuthorizationService, useValue: { hasPermission: () => writeAllowed } },
        { provide: ShiftFormService, useValue: {} },
        { provide: LocalStorageService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(EditShiftItemComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(EditShiftItemComponent);
  };

  beforeEach(() => {
    writeAllowed = true;
    statusLocked = true;
    storedUntilDate = false;
    endDateOpen = true;
  });

  it('stays open on a locked shift without a stored end date, and shows the hint', () => {
    const component = createFixture().componentInstance;

    expect(component.isValidUntilDisabled).toBe(false);
    expect(component.isEndDateHintVisible).toBe(true);
  });

  it('locks a stored end date on a locked shift', () => {
    storedUntilDate = true;
    endDateOpen = false;
    const component = createFixture().componentInstance;

    expect(component.isValidUntilDisabled).toBe(true);
    expect(component.isEndDateHintVisible).toBe(false);
  });

  it('keeps a stored end date editable on a draft order', () => {
    statusLocked = false;
    storedUntilDate = true;
    endDateOpen = false;

    expect(createFixture().componentInstance.isValidUntilDisabled).toBe(false);
  });

  it('disables the field and hides the hint without the write right', () => {
    writeAllowed = false;
    const component = createFixture().componentInstance;

    expect(component.isValidUntilDisabled).toBe(true);
    expect(component.isEndDateHintVisible).toBe(false);
  });

  it('disables the field and hides the hint on a read-only link', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('isReadOnly', true);

    expect(fixture.componentInstance.isValidUntilDisabled).toBe(true);
    expect(fixture.componentInstance.isEndDateHintVisible).toBe(false);
  });
});
