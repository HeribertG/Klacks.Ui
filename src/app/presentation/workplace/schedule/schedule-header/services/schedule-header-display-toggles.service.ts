// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Display toggles of the schedule header for break placeholders, schedule commands and the availability check;
 * each toggle recolours its toolbar icon to the new state.
 * @param icon - Toolbar icon of the toggle; absent while the button is hidden (timeline mode, no availability data)
 */
import { computed, inject, Injectable } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IconBreakPlaceholderComponent } from 'src/app/presentation/icons/icon-break-placeholder.component';
import { IconThunderCircleComponent } from 'src/app/presentation/icons/icon-thunder-circle.component';
import { IconAvailabilityCheckComponent } from 'src/app/presentation/icons/icon-availability-check.component';
import { ScheduleDataService } from '../../schedule-section/services/schedule-data.service';

@Injectable()
export class ScheduleHeaderDisplayTogglesService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private scheduleDataService = inject(ScheduleDataService);

  readonly hasAvailabilityData = computed(() => {
    this.dataManagementSchedule.isRead();
    return this.dataManagementSchedule.hasAvailabilityData;
  });

  get showAvailability(): boolean {
    return this.dataManagementSchedule.showAvailability();
  }

  get showBreakPlaceholders(): boolean {
    return this.dataManagementSchedule.showBreakPlaceholders();
  }

  get showScheduleCommands(): boolean {
    return this.scheduleDataService.showScheduleCommands();
  }

  colourIcons(
    breakPlaceholderIcon: IconBreakPlaceholderComponent | undefined,
    scheduleCommandsIcon: IconThunderCircleComponent | undefined,
    availabilityCheckIcon: IconAvailabilityCheckComponent | undefined,
  ): void {
    breakPlaceholderIcon?.ChangeColor(this.showBreakPlaceholders);
    scheduleCommandsIcon?.ChangeColor(this.showScheduleCommands);
    availabilityCheckIcon?.ChangeColor(this.showAvailability);
  }

  toggleBreakPlaceholders(icon: IconBreakPlaceholderComponent | undefined): void {
    this.dataManagementSchedule.toggleBreakPlaceholders();
    icon?.ChangeColor(this.showBreakPlaceholders);
  }

  toggleScheduleCommands(icon: IconThunderCircleComponent | undefined): void {
    this.scheduleDataService.showScheduleCommands.update((v) => !v);
    icon?.ChangeColor(this.showScheduleCommands);
  }

  onAvailabilityCheck(icon: IconAvailabilityCheckComponent | undefined): void {
    this.dataManagementSchedule.toggleAvailability();
    icon?.ChangeColor(this.showAvailability);
  }
}
