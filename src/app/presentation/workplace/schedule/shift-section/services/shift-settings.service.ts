/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Settings service for the shift grid. Extends BaseSettingsService with
 * shift-specific configurations like no header row and row-only selection mode.
 * Adjusts cell height based on zoom level.
 *
 * @relations
 * - Extends: BaseSettingsService
 * - Used by: ShiftSectionComponent
 * - Provided as: BaseSettingsService in shift section
 */
import { Injectable } from '@angular/core';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridSelectionModeEnum } from 'src/app/presentation/shared/grid/enums/divers';

@Injectable()
export class ShiftSettingsService extends BaseSettingsService {
  override hasHeader = false;
  override cellHeight = 38;
  override cellHeaderHeight = 0;
  override selectionMode: GridSelectionModeEnum =
    GridSelectionModeEnum.RowActiveOnly;

  private readonly baseCellHeight = 38;

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
