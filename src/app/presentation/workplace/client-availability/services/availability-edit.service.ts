// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Edit rules of the availability page shared by the grid and the header: whether the user may change availabilities
 * (the same Admin or Authorised roles the bulk-save endpoint requires) and clearing every hour of the selected
 * client day to "no entry", which persists like a Ctrl-drag.
 * @param authorization - Rights of the signed-in user
 * @param selection - Currently selected grid cell (row = client, column = day and hour group)
 * @param renderGrid - Clients shown in the grid rows
 * @param calculation - Maps a grid column onto its date
 * @param dataManagement - Holds the stored hours and saves the change debounced
 * @param drawGrid - Redraws the grid after the change
 */

import { Injectable, computed, inject } from '@angular/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { AVAILABILITY_HOURS_PER_DAY } from 'src/app/domain/models/client-availability/hour-grouping-mode.enum';
import { AvailabilitySelectionService } from './availability-selection.service';
import { RenderAvailabilityGridService } from './render-availability-grid';
import { AvailabilityCalculationService } from './render-availability-grid/availability-calculation.service';
import { DrawAvailabilityGridService } from './draw-availability-grid.service';

const FIRST_HOUR_OF_DAY = 0;

@Injectable()
export class AvailabilityEditService {
  private authorization = inject(AuthorizationService);
  private selection = inject(AvailabilitySelectionService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private calculation = inject(AvailabilityCalculationService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private drawGrid = inject(DrawAvailabilityGridService);

  readonly canClearDay = computed(
    () => this.selection.selectedRow() >= 0 && this.selection.selectedCol() >= 0 && this.canEditAvailability(),
  );

  canEditAvailability(): boolean {
    return this.authorization.isAuthorised;
  }

  clearSelectedDay(): boolean {
    if (!this.canEditAvailability() || !this.selection.hasSelection()) {
      return false;
    }
    const client = this.renderGrid.getClients()[this.selection.selectedRow()];
    if (!client) {
      return false;
    }
    const dateHour = this.calculation.columnToDateHour(this.selection.selectedCol());
    this.dataManagement.setHourRange(client.id, dateHour.dateString, FIRST_HOUR_OF_DAY, AVAILABILITY_HOURS_PER_DAY, null);
    this.drawGrid.drawGrid();
    return true;
  }
}
