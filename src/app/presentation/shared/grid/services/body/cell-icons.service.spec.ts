// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { WORK_MOVED_ICON } from '../../constants/work-cell-icon.constants';
import { CellIconsService } from './cell-icons.service';

describe('CellIconsService icon loading', () => {
  let service: CellIconsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CellIconsService, { provide: GridColorService, useValue: { mainFontColor: '#000000' } }],
    });
    service = TestBed.inject(CellIconsService);
  });

  afterEach(() => vi.restoreAllMocks());

  it('counts an icon whose image finishes loading after the first draw asked for it', () => {
    let finishLoading: () => void = () => undefined;
    const pending = document.createElement('canvas');
    vi.spyOn(DrawHelper, 'createCanvasFromSvgStringSync').mockImplementation((_svg, _width, _height, callback) => {
      finishLoading = () => callback(pending);
      return pending;
    });

    expect(service.getIcon(WORK_MOVED_ICON, 12)).toBe(pending);
    expect(service.iconsLoaded()).toBe(0);

    finishLoading();

    expect(service.iconsLoaded()).toBe(1);
  });

  it('does not count an icon the helper returns already loaded', () => {
    const loaded = document.createElement('canvas');
    vi.spyOn(DrawHelper, 'createCanvasFromSvgStringSync').mockImplementation((_svg, _width, _height, callback) => {
      callback(loaded);
      return loaded;
    });

    service.getIcon(WORK_MOVED_ICON, 12);

    expect(service.iconsLoaded()).toBe(0);
  });
});
