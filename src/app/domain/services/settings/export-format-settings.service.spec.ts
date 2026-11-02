// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ExportFormatSettingsService } from './export-format-settings.service';

const format = (key: string, fixed: boolean, enabled: boolean): ExportFormatResource => ({
  key,
  fixed,
  enabled,
  family: 'order',
  brand: key,
});

describe('ExportFormatSettingsService', () => {
  let service: ExportFormatSettingsService;
  let formatsApi: { getFormats: ReturnType<typeof vi.fn> };
  let settingsApi: {
    readSetting: ReturnType<typeof vi.fn>;
    updateSetting: ReturnType<typeof vi.fn>;
    addSetting: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    formatsApi = { getFormats: vi.fn() };
    settingsApi = {
      readSetting: vi.fn(),
      updateSetting: vi.fn().mockImplementation((setting) => of({ ...setting, id: 'stored' })),
      addSetting: vi.fn().mockImplementation((setting) => of({ ...setting, id: 'created' })),
    };
    TestBed.configureTestingModule({
      providers: [
        ExportFormatSettingsService,
        { provide: DataExportFormatsService, useValue: formatsApi },
        { provide: DataSettingsVariousService, useValue: settingsApi },
      ],
    });
    service = TestBed.inject(ExportFormatSettingsService);
  });

  it('returns the formats of the API', async () => {
    const formats = [format('csv', true, true)];
    formatsApi.getFormats.mockReturnValue(of(formats));

    await expect(firstValueFrom(service.getFormats())).resolves.toBe(formats);
  });

  describe('readEnabledFormatsSettingId', () => {
    it('returns the id of the stored setting', async () => {
      settingsApi.readSetting.mockReturnValue(of({ id: 'setting-1', type: 'ENABLED_EXPORT_FORMATS', value: '' }));

      await expect(firstValueFrom(service.readEnabledFormatsSettingId())).resolves.toBe('setting-1');
      expect(settingsApi.readSetting).toHaveBeenCalledWith('ENABLED_EXPORT_FORMATS');
    });

    it('returns undefined when the setting does not exist yet', async () => {
      settingsApi.readSetting.mockReturnValue(of(null));

      await expect(firstValueFrom(service.readEnabledFormatsSettingId())).resolves.toBeUndefined();
    });

    it('returns undefined when reading the setting fails', async () => {
      settingsApi.readSetting.mockReturnValue(throwError(() => new Error('offline')));

      await expect(firstValueFrom(service.readEnabledFormatsSettingId())).resolves.toBeUndefined();
    });
  });

  describe('readDatevNumberSetting', () => {
    it('returns id and parsed number of the stored setting', async () => {
      settingsApi.readSetting.mockReturnValue(of({ id: 'n-1', type: 'DATEV_CLIENT_NUMBER', value: '4711' }));

      await expect(firstValueFrom(service.readDatevNumberSetting('DATEV_CLIENT_NUMBER'))).resolves.toEqual({
        id: 'n-1',
        value: 4711,
      });
      expect(settingsApi.readSetting).toHaveBeenCalledWith('DATEV_CLIENT_NUMBER');
    });

    it('returns a null value for an empty stored value', async () => {
      settingsApi.readSetting.mockReturnValue(of({ id: 'n-1', type: 'DATEV_CLIENT_NUMBER', value: '' }));

      await expect(firstValueFrom(service.readDatevNumberSetting('DATEV_CLIENT_NUMBER'))).resolves.toEqual({
        id: 'n-1',
        value: null,
      });
    });

    it('returns an empty state when the setting does not exist yet', async () => {
      settingsApi.readSetting.mockReturnValue(of(null));

      await expect(firstValueFrom(service.readDatevNumberSetting('DATEV_CLIENT_NUMBER'))).resolves.toEqual({
        id: undefined,
        value: null,
      });
    });

    it('returns an empty state when reading fails', async () => {
      settingsApi.readSetting.mockReturnValue(throwError(() => new Error('offline')));

      await expect(firstValueFrom(service.readDatevNumberSetting('DATEV_CLIENT_NUMBER'))).resolves.toEqual({
        id: undefined,
        value: null,
      });
    });
  });

  describe('saveNumberSetting', () => {
    it('updates an existing setting with the number as text', async () => {
      const saved = await firstValueFrom(service.saveNumberSetting('DATEV_CONSULTANT_NUMBER', 'n-1', 1234567));

      expect(settingsApi.updateSetting).toHaveBeenCalledWith({
        id: 'n-1',
        type: 'DATEV_CONSULTANT_NUMBER',
        value: '1234567',
      });
      expect(saved.id).toBe('stored');
    });

    it('creates the setting when none exists yet', async () => {
      const saved = await firstValueFrom(service.saveNumberSetting('DATEV_CONSULTANT_NUMBER', undefined, 1001));

      expect(settingsApi.addSetting).toHaveBeenCalledWith({
        id: undefined,
        type: 'DATEV_CONSULTANT_NUMBER',
        value: '1001',
      });
      expect(saved.id).toBe('created');
    });

    it('clears an existing setting with an empty value', async () => {
      await firstValueFrom(service.saveNumberSetting('DATEV_CLIENT_NUMBER', 'n-2', null));

      expect(settingsApi.updateSetting).toHaveBeenCalledWith({ id: 'n-2', type: 'DATEV_CLIENT_NUMBER', value: '' });
    });

    it('does not call the API when clearing a setting that was never stored', async () => {
      await firstValueFrom(service.saveNumberSetting('DATEV_CLIENT_NUMBER', undefined, null));

      expect(settingsApi.addSetting).not.toHaveBeenCalled();
      expect(settingsApi.updateSetting).not.toHaveBeenCalled();
    });
  });

  describe('saveEnabledFormats', () => {
    const formats = [
      format('csv', true, true),
      format('datev', false, true),
      format('abacus', false, false),
      format('sage', false, true),
    ];

    it('stores only the enabled, non-fixed formats as a comma-separated value and updates an existing setting', async () => {
      const saved = await firstValueFrom(service.saveEnabledFormats(formats, 'setting-1'));

      expect(settingsApi.updateSetting).toHaveBeenCalledWith({
        id: 'setting-1',
        type: 'ENABLED_EXPORT_FORMATS',
        value: 'datev,sage',
      });
      expect(settingsApi.addSetting).not.toHaveBeenCalled();
      expect(saved.id).toBe('stored');
    });

    it('creates the setting when none exists yet', async () => {
      const saved = await firstValueFrom(service.saveEnabledFormats(formats, undefined));

      expect(settingsApi.addSetting).toHaveBeenCalledWith({
        id: undefined,
        type: 'ENABLED_EXPORT_FORMATS',
        value: 'datev,sage',
      });
      expect(settingsApi.updateSetting).not.toHaveBeenCalled();
      expect(saved.id).toBe('created');
    });

    it('stores an empty value when no optional format is enabled', async () => {
      await firstValueFrom(service.saveEnabledFormats([format('csv', true, true)], 'setting-1'));

      expect(settingsApi.updateSetting).toHaveBeenCalledWith(expect.objectContaining({ value: '' }));
    });
  });
});
