// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Switches what the container template editor shows: weekday, holiday variant, template tab and employment tab.
 * @param state - Editor state whose weekday and holiday flag the template radio buttons and checkbox write
 */
import { Injectable, inject } from '@angular/core';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateTabService } from './container-template-tab.service';
import { ContainerTemplateViewRefreshService } from './container-template-view-refresh.service';

@Injectable()
export class ContainerTemplateSelectionService {
  private state = inject(ContainerTemplateEditorStateService);
  private tabService = inject(ContainerTemplateTabService);
  private containerService = inject(DataManagementContainerService);
  private viewRefresh = inject(ContainerTemplateViewRefreshService);

  onWeekdayChange(): void {
    this.tabService.onWeekdayChange(this.state.selectedWeekday);
    this.state.syncItemBufferKey();
    const weekdayNumber = this.state.selectedWeekdayNumber();
    if (weekdayNumber === null) return;

    this.containerService
      .loadTasksForWeekday(weekdayNumber)
      .subscribe(() => this.viewRefresh.refreshSelection());
  }

  onHolidayVariantChange(): void {
    this.state.applyHolidayVariantToWeekday();
    this.onWeekdayChange();
  }

  selectTab(index: number): void {
    this.tabService.selectTab(index);
    this.viewRefresh.refreshSelection();
  }

  async selectEmploymentTab(): Promise<void> {
    await this.tabService.selectEmploymentTab();
    this.viewRefresh.markForCheck();
  }
}
