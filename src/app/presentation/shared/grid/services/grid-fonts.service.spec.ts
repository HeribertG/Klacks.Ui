// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConstantKeys } from 'src/app/domain/constants/grid-constants';
import { DEFAULT_GRID_FONT_STACK } from 'src/app/domain/constants/grid-font.constants';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { GridFontsService } from './grid-fonts.service';
import { ensureFontFallback } from './ensure-font-fallback';

describe('GridFontsService font fallback', () => {
  let settings: { type: string; value: string }[];
  let service: GridFontsService;

  beforeEach(() => {
    settings = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataSettingsVariousService,
          useValue: { readSettingList: () => of(settings) },
        },
      ],
    });
    service = TestBed.inject(GridFontsService);
  });

  it('uses a default stack that ends with a sans-serif fallback', () => {
    expect(service.mainFontName).toBe(DEFAULT_GRID_FONT_STACK);
    expect(service.mainFontString).toContain('sans-serif');
  });

  it('appends sans-serif to a stored font without generic family', async () => {
    settings = [{ type: ConstantKeys.MAIN_FONT_NAME_KEY, value: 'Calibri' }];
    await service.readDataAsync();
    expect(service.mainFontName).toBe('Calibri, sans-serif');
  });

  it('keeps a stored font that already has a generic family', async () => {
    settings = [
      { type: ConstantKeys.FIRST_SUB_FONT_NAME_KEY, value: 'Calibri, serif' },
    ];
    await service.readDataAsync();
    expect(service.firstSubFontName).toBe('Calibri, serif');
  });

  it('ensureFontFallback treats quoted and cased generics as generic', () => {
    expect(ensureFontFallback('"Segoe UI", Sans-Serif')).toBe('"Segoe UI", Sans-Serif');
    expect(ensureFontFallback('Arial')).toBe('Arial, sans-serif');
  });

  it('ensureFontFallback does not accept system-ui alone as a fallback', () => {
    expect(ensureFontFallback('system-ui')).toBe('system-ui, sans-serif');
    expect(ensureFontFallback('"Segoe UI"')).toBe('"Segoe UI", sans-serif');
  });

  it('ensureFontFallback keeps chains that already end in a generic family', () => {
    expect(ensureFontFallback('Arial, sans-serif')).toBe('Arial, sans-serif');
    expect(ensureFontFallback('system-ui, sans-serif')).toBe('system-ui, sans-serif');
    expect(ensureFontFallback(DEFAULT_GRID_FONT_STACK)).toBe(DEFAULT_GRID_FONT_STACK);
  });
});
