import { TestBed } from '@angular/core/testing';
import { CreateHeaderService } from './create-header.service';
import { SettingsService } from './settings.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';
import { GridSettingsService } from 'src/app/grid/services/grid-settings.service';
import { TranslateService } from '@ngx-translate/core';
import { DataService } from './data.service';
import { Rectangle } from 'src/app/grid/classes/geometry';

describe('CreateHeaderService', () => {
  let service: CreateHeaderService;

  const mockSettingsService = {
    rowHeaderIconWith: 20,
    rowHeaderIconHeight: 20,
  };

  const mockGridColorService = {
    backGroundColor: '#f2eded',
    backGroundColorSaturday: '#F5F5DC',
    backGroundColorHolyday: '#82E0AA',
    backGroundColorSunday: '#95b9d0',
    backGroundColorOfficiallyHoliday: '#48C9B0',
    borderColor: '#abad94',
    mainFontColor: '#000000',
    subFontColor: '#404040',
    foreGroundColor: '#000000',
    controlBackGroundColor: '#D5DBDB',
    headerBackGroundColor: '#FFFFFF',
    headerForeGroundColor: '#4d4d4d',
    focusBorderColor: '#1E90FF',
    evenMonthColor: '#f2eded',
    oddMonthColor: '#dad7d7',
    borderColorEndMonth: '#566573',
    backGroundContainerColor: '#424949',
    toolTipBackGroundColor: '#ffffcc',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CreateHeaderService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: GridColorService, useValue: mockGridColorService },
        { provide: GridFontsService, useValue: undefined },
        { provide: GridSettingsService, useValue: undefined },
        { provide: DataService, useValue: undefined },
        { provide: TranslateService, useValue: undefined },
      ],
    });
    service = TestBed.inject(CreateHeaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize correctly', () => {
    expect(service).toBeDefined();
  });
});
