// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ShiftPreferencesDialogComponent } from './shift-preferences-dialog.component';
import { DataShiftPreferenceService } from 'src/app/infrastructure/api/shift/data-shift-preference.service';
import { IClientShiftPreference } from 'src/app/domain/models/shift/client-shift-preference.interface';
import { IAvailableShift } from 'src/app/domain/models/shift/shift-preference';
import { ShiftPreferenceType } from 'src/app/domain/models/shift/shift-preference-type.enum';

describe('ShiftPreferencesDialogComponent', () => {
  let component: ShiftPreferencesDialogComponent;
  let api: {
    getByClient: ReturnType<typeof vi.fn>;
    getAvailableShifts: ReturnType<typeof vi.fn>;
    saveAll: ReturnType<typeof vi.fn>;
  };
  let close: ReturnType<typeof vi.fn>;

  const SHIFTS: IAvailableShift[] = [
    { id: 'shift-early', name: 'Early' },
    { id: 'shift-late', name: 'Late' },
    { id: 'shift-night', name: 'Night' },
  ];

  function preference(shiftId: string, preferenceType: ShiftPreferenceType): IClientShiftPreference {
    return { id: `pref-${shiftId}`, clientId: 'client-1', shiftId, preferenceType };
  }

  beforeEach(async () => {
    close = vi.fn();
    api = {
      getByClient: vi.fn().mockReturnValue(
        of([
          preference('shift-late', ShiftPreferenceType.Blacklist),
          preference('shift-early', ShiftPreferenceType.Preferred),
        ]),
      ),
      getAvailableShifts: vi.fn().mockReturnValue(of(SHIFTS)),
      saveAll: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ShiftPreferencesDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataShiftPreferenceService, useValue: api },
        { provide: NgbModal, useValue: { open: vi.fn().mockReturnValue({ close, dismiss: vi.fn() }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ShiftPreferencesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('splits the stored preferences into preferred and blacklisted shifts and offers the rest', () => {
    component.open('client-1', 'Clara Ackermann');

    expect(api.getByClient).toHaveBeenCalledWith('client-1');
    expect(api.getAvailableShifts).toHaveBeenCalledWith('client-1');
    expect(component.preferredShifts.map((p) => p.shiftId)).toEqual(['shift-early']);
    expect(component.blacklistShifts.map((p) => p.shiftId)).toEqual(['shift-late']);
    expect(component.availableShifts.map((s) => s.id)).toEqual(['shift-night']);
  });

  it('saves the preferred shifts before the blacklisted ones and closes the dialog', () => {
    component.open('client-1', 'Clara Ackermann');

    component.onSave();

    expect(api.saveAll).toHaveBeenCalledTimes(1);
    const [clientId, saved] = api.saveAll.mock.calls[0] as [string, IClientShiftPreference[]];
    expect(clientId).toBe('client-1');
    expect(saved.map((p) => p.shiftId)).toEqual(['shift-early', 'shift-late']);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
