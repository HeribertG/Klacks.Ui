import { Injectable } from '@angular/core';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';

@Injectable()
export class ShiftSettingsService extends BaseSettingsService {
  override hasHeader = false;
  override cellHeight = 40;
  override cellHeaderHeight = 0;

  constructor() {
    super();
  }
}
