import { inject, Injectable } from '@angular/core';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';
import { GridFontsService } from 'src/app/shared/grid/services/grid-fonts.service';

@Injectable()
export class ShiftSettingsService extends BaseSettingsService {
  override hasHeader = false;
  override cellHeight = 35;
  override cellHeaderHeight = 0;

  constructor() {
    super(inject(GridFontsService));
  }
}
