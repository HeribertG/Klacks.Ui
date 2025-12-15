import { Injectable } from '@angular/core';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridSelectionModeEnum } from 'src/app/presentation/shared/grid/enums/divers';

@Injectable()
export class ShiftSettingsService extends BaseSettingsService {
  override hasHeader = false;
  override cellHeight = 40;
  override cellHeaderHeight = 0;
  override selectionMode: GridSelectionModeEnum = GridSelectionModeEnum.RowActiveOnly;

  private readonly baseCellHeight = 40;

  constructor() {
    super();
  }

  override set zoom(value: number) {
    super.zoom = value;
    this.cellHeight = this.baseCellHeight * value;
    this.cellHeaderHeight = 0;
  }

  override get zoom(): number {
    return super.zoom;
  }
}
