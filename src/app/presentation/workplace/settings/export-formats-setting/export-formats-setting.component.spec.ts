// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';

import {
  DATEV_NUMBER_SETTING_KEYS,
  DatevNumberErrorKeys,
  DatevNumberFields,
} from 'src/app/domain/constants/datev-numbers.constants';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { ExportFormatSettingsService } from 'src/app/domain/services/settings/export-format-settings.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ExportFormatsSettingComponent } from './export-formats-setting.component';

const INPUT_ID_PREFIX = '#export-formats-setting-datev-';
const HINT_ID = 'export-formats-setting-datev-hint';

const format = (key: string, enabled: boolean, family = 'order', fixed = false): ExportFormatResource => ({
  key,
  fixed,
  enabled,
  family,
  brand: key,
});

describe('ExportFormatsSettingComponent', () => {
  let fixture: ComponentFixture<ExportFormatsSettingComponent>;
  let service: {
    getFormats: ReturnType<typeof vi.fn>;
    readEnabledFormatsSettingId: ReturnType<typeof vi.fn>;
    readDatevNumberSetting: ReturnType<typeof vi.fn>;
    saveEnabledFormats: ReturnType<typeof vi.fn>;
    saveNumberSetting: ReturnType<typeof vi.fn>;
  };
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  const consultantKey = DATEV_NUMBER_SETTING_KEYS[DatevNumberFields.Consultant];

  async function createComponent(formats: ExportFormatResource[]): Promise<void> {
    service.getFormats.mockReturnValue(of(formats));
    fixture = TestBed.createComponent(ExportFormatsSettingComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function input(field: string): HTMLInputElement | null {
    return fixture.nativeElement.querySelector(`${INPUT_ID_PREFIX}${field}`);
  }

  function errorElement(field: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`#export-formats-setting-datev-error-${field}`);
  }

  function type(field: string, text: string): void {
    const el = input(field) as HTMLInputElement;
    el.value = text;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function commit(field: string): void {
    (input(field) as HTMLInputElement).dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function savedSetting(value: string, id = 'created'): ISetting {
    return { id, type: consultantKey, value };
  }

  beforeEach(async () => {
    service = {
      getFormats: vi.fn(),
      readEnabledFormatsSettingId: vi.fn().mockReturnValue(of(undefined)),
      readDatevNumberSetting: vi.fn().mockReturnValue(of({ id: undefined, value: null })),
      saveEnabledFormats: vi.fn().mockReturnValue(of(savedSetting('', 'formats'))),
      saveNumberSetting: vi.fn().mockReturnValue(of(savedSetting('', 'created'))),
    };
    toast = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ExportFormatsSettingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ExportFormatSettingsService, useValue: service },
        { provide: ToastShowService, useValue: toast },
      ],
    }).compileComponents();
  });

  describe('visibility of the DATEV number inputs', () => {
    it('hides the inputs while no DATEV format is enabled', async () => {
      await createComponent([format('csv', true, 'order', true), format('datev', false)]);

      expect(input(DatevNumberFields.Consultant)).toBeNull();
      expect(input(DatevNumberFields.Client)).toBeNull();
    });

    it('shows the inputs while a DATEV format is enabled', async () => {
      await createComponent([format('csv', true, 'order', true), format('datev', true)]);

      expect(input(DatevNumberFields.Consultant)).not.toBeNull();
      expect(input(DatevNumberFields.Client)).not.toBeNull();
    });

    it('shows the stored numbers', async () => {
      service.readDatevNumberSetting.mockReturnValue(of({ id: 'n-1', value: 1234 }));

      await createComponent([format('datev', true)]);

      expect((input(DatevNumberFields.Consultant) as HTMLInputElement).value).toBe('1234');
    });
  });

  describe('validation', () => {
    beforeEach(async () => {
      await createComponent([format('datev', true)]);
    });

    it('does not save a value outside the range and shows the error', () => {
      type(DatevNumberFields.Consultant, '1000');
      commit(DatevNumberFields.Consultant);

      expect(service.saveNumberSetting).not.toHaveBeenCalled();
      const error = errorElement(DatevNumberFields.Consultant);
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain(DatevNumberErrorKeys.OutOfRange);
      expect(input(DatevNumberFields.Consultant)?.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not save text that is not a whole number', () => {
      type(DatevNumberFields.Client, '12.5');
      commit(DatevNumberFields.Client);

      expect(service.saveNumberSetting).not.toHaveBeenCalled();
      expect(errorElement(DatevNumberFields.Client)?.textContent).toContain(DatevNumberErrorKeys.NotInteger);
    });

    it('always describes the input by the hint and adds the error id while an error is shown', () => {
      const el = input(DatevNumberFields.Consultant) as HTMLInputElement;
      expect(el.getAttribute('aria-describedby')).toBe(HINT_ID);

      type(DatevNumberFields.Consultant, '1000');

      expect(el.getAttribute('aria-describedby')).toBe(
        `${HINT_ID} export-formats-setting-datev-error-${DatevNumberFields.Consultant}`,
      );
    });
  });

  describe('saving', () => {
    beforeEach(async () => {
      await createComponent([format('datev', true)]);
    });

    it('saves a valid value exactly once even if blur and Enter both commit', () => {
      type(DatevNumberFields.Consultant, '1234567');
      commit(DatevNumberFields.Consultant);
      (input(DatevNumberFields.Consultant) as HTMLInputElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter' }),
      );

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(1);
      expect(service.saveNumberSetting).toHaveBeenCalledWith(consultantKey, undefined, 1234567);
      expect(toast.showSuccess).toHaveBeenCalledTimes(1);
      expect(errorElement(DatevNumberFields.Consultant)).toBeNull();
    });

    it('ignores a second commit of the same field while the first save is still running', () => {
      const pending = new Subject<ISetting>();
      service.saveNumberSetting.mockReturnValue(pending.asObservable());

      type(DatevNumberFields.Consultant, '1234567');
      commit(DatevNumberFields.Consultant);
      commit(DatevNumberFields.Consultant);

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(1);

      pending.next(savedSetting('1234567'));
      pending.complete();

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(1);
    });

    it('repeats the commit with the newest value and the new setting id once the running save has finished', () => {
      const first = new Subject<ISetting>();
      service.saveNumberSetting
        .mockReturnValueOnce(first.asObservable())
        .mockReturnValueOnce(of(savedSetting('1234568', 'created')));

      type(DatevNumberFields.Consultant, '1234567');
      commit(DatevNumberFields.Consultant);
      type(DatevNumberFields.Consultant, '1234568');
      commit(DatevNumberFields.Consultant);

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(1);

      first.next(savedSetting('1234567', 'created'));
      first.complete();

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(2);
      expect(service.saveNumberSetting).toHaveBeenLastCalledWith(consultantKey, 'created', 1234568);
    });

    it('saves the two fields independently', () => {
      const pending = new Subject<ISetting>();
      service.saveNumberSetting.mockReturnValueOnce(pending.asObservable());

      type(DatevNumberFields.Consultant, '1234567');
      commit(DatevNumberFields.Consultant);
      type(DatevNumberFields.Client, '4711');
      commit(DatevNumberFields.Client);

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(2);
    });

    it('allows a retry after a failed save and clears the error with the next commit', () => {
      service.saveNumberSetting
        .mockReturnValueOnce(throwError(() => new Error('offline')) as Observable<ISetting>)
        .mockReturnValueOnce(of(savedSetting('1234567')));

      type(DatevNumberFields.Consultant, '1234567');
      commit(DatevNumberFields.Consultant);

      expect(errorElement(DatevNumberFields.Consultant)?.textContent).toContain(DatevNumberErrorKeys.SaveFailed);
      expect(toast.showSuccess).not.toHaveBeenCalled();

      commit(DatevNumberFields.Consultant);

      expect(service.saveNumberSetting).toHaveBeenCalledTimes(2);
      expect(service.saveNumberSetting).toHaveBeenLastCalledWith(consultantKey, undefined, 1234567);
      expect(errorElement(DatevNumberFields.Consultant)).toBeNull();
      expect(toast.showSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
