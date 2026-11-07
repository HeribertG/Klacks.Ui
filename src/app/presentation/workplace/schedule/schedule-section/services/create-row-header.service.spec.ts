// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { ClientWork } from 'src/app/domain/models/schedule/client-work-class';
import { ScheduleChangeService } from 'src/app/domain/services/schedule/schedule-change.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { RowHeaderIconsService } from 'src/app/presentation/shared/grid/services/row-header-icons.service';
import { BaseCreateRowHeaderService } from './create-row-header.service';

const NO_CONTRACT_SYMBOL = '⊘';
const STAND_IN_SYMBOL = '◌';
const FEMALE_SYMBOL = '♀';
const CELL_WIDTH = 200;

function recordingContext(texts: string[]): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {
    fillText: (text: string) => texts.push(text),
    measureText: () => ({ width: 0 }),
  };
  return new Proxy(state, {
    get: (target, prop) => (prop in target ? target[prop] : () => undefined),
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function client(overrides: Partial<ClientWork>): ClientWork {
  return Object.assign(new ClientWork(), {
    id: 'c1',
    idNumber: 7,
    firstName: 'Anna',
    name: 'Muster',
    gender: GenderEnum.female,
    legalEntity: false,
    type: EntityTypeEnum.employee,
    hasContract: true,
    ...overrides,
  });
}

describe('BaseCreateRowHeaderService', () => {
  let service: BaseCreateRowHeaderService;
  let rowClient: ClientWork;
  let texts: string[];

  beforeEach(() => {
    texts = [];
    vi.spyOn(DrawHelper, 'createHiDPICanvas').mockReturnValue(recordingContext(texts));
    vi.spyOn(DrawHelper, 'fillRectangle').mockImplementation(() => undefined);
    vi.spyOn(DrawHelper, 'drawBorder').mockImplementation(() => undefined);
    vi.spyOn(DrawHelper, 'drawText').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        BaseCreateRowHeaderService,
        {
          provide: BaseSettingsService,
          useValue: {
            rowHeaderIconWith: 20,
            rowHeaderIconHeight: 20,
            zoom: 1,
            InfoSpotWidth: 40,
            increaseBorder: 1,
            headerBorderWidth: 1,
            borderWidth: 1,
            cellHeaderHeight: 20,
            getDisplayRows: (rows: number) => rows,
            getGroupLineHeight: () => 60,
          },
        },
        {
          provide: BaseDataService,
          useValue: {
            rows: 3,
            indexes: 1,
            rowGroupIndex: [0, 0, 0],
            indexGroupRow: [0],
            getGroupIndex: () => rowClient,
            getRowHeaderSlot1Text: () => '',
            getRowHeaderSlot2Text: () => '',
            getRowHeaderSlot3Text: () => '',
          },
        },
        { provide: RowHeaderIconsService, useValue: { reset: vi.fn(), gripPicto: undefined } },
        { provide: GridColorService, useValue: {} },
        { provide: GridFontsService, useValue: { headerFontStringZoom: '12px Arial', headerFontHeightZoom: 12 } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: WorkScheduleLoaderService, useValue: { totalAvailableClients: 0 } },
        { provide: ScheduleChangeService, useValue: { isDirty: () => false } },
      ],
    });
    service = TestBed.inject(BaseCreateRowHeaderService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks a stand-in row with the stand-in sign, without the missing-contract sign or a gender sign', () => {
    rowClient = client({ type: EntityTypeEnum.standIn, firstName: undefined, name: 'Messe 1', hasContract: false });

    service.createCell(0, CELL_WIDTH);

    expect(texts).toContain(STAND_IN_SYMBOL);
    expect(texts).not.toContain(NO_CONTRACT_SYMBOL);
    expect(texts).not.toContain(FEMALE_SYMBOL);
    expect(texts).toContain('Messe 1');
  });

  it('keeps the missing-contract sign and the gender sign of a person without a contract', () => {
    rowClient = client({ hasContract: false });

    service.createCell(0, CELL_WIDTH);

    expect(texts).toContain(NO_CONTRACT_SYMBOL);
    expect(texts).toContain(FEMALE_SYMBOL);
    expect(texts).not.toContain(STAND_IN_SYMBOL);
    expect(texts).toContain('Anna Muster');
  });

  it('draws no sign in the corner of a person with a contract', () => {
    rowClient = client({});

    service.createCell(0, CELL_WIDTH);

    expect(texts).not.toContain(NO_CONTRACT_SYMBOL);
    expect(texts).not.toContain(STAND_IN_SYMBOL);
  });
});
