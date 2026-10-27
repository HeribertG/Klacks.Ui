// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Bottom zone of the container template editor: the slot tabs and the employment tab, the sortable table of available
 * tasks of the selected slot and the container absences, both as drag sources for the selected tasks. It reads the
 * editor services provided by the container template component. That editor state lives in plain service fields and
 * arrays (mutated in place by the CDK drop handling) that only the markForCheck of the container template component
 * refreshes, so the OnPush view marks itself in ngDoCheck and is refreshed whenever the parent view is checked, exactly
 * like the inline template it replaces.
 * @param state - Editor state with the loading flag and the template grid
 * @param tabService - Selected slot tab, employment tab flag, available tasks and container absences
 * @param viewRefresh - Tab rows and labels of the selected weekday and the column sorting
 * @param selection - Switches between the slot tabs and the employment tab
 * @param sortingService - Sort arrows of the available task columns
 * @param taskActions - Marks time range tasks that only partly fit the container time window
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, inject } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { formatClientWithAddress, formatWorkTime } from 'src/app/domain/helpers/container-template-format.helper';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';
import { ContainerTemplateEditorStateService } from '../services/container-template-editor-state.service';
import { ContainerTemplateTabService } from '../services/container-template-tab.service';
import { ContainerTemplateViewRefreshService } from '../services/container-template-view-refresh.service';
import { ContainerTemplateSelectionService } from '../services/container-template-selection.service';
import { ContainerTemplateTaskActionsService } from '../services/container-template-task-actions.service';

@Component({
  selector: 'app-container-template-available-zone',
  imports: [
    TranslateModule,
    DragDropModule,
    FallbackPipe,
    IconShiftSegmentComponent,
    IconTimeWindowComponent,
    IconUnknownTimeComponent,
  ],
  templateUrl: './container-template-available-zone.component.html',
  styleUrl: './container-template-available-zone.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerTemplateAvailableZoneComponent implements DoCheck {
  protected readonly formatTime = formatTime;
  protected readonly formatWorkTime = formatWorkTime;
  protected readonly formatClientWithAddress = formatClientWithAddress;

  protected readonly translateService = inject(TranslateService);
  protected readonly state = inject(ContainerTemplateEditorStateService);
  protected readonly tabService = inject(ContainerTemplateTabService);
  protected readonly viewRefresh = inject(ContainerTemplateViewRefreshService);
  protected readonly selection = inject(ContainerTemplateSelectionService);
  protected readonly sortingService = inject(TableSortingService);
  protected readonly taskActions = inject(ContainerTemplateTaskActionsService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  ngDoCheck(): void {
    this.changeDetectorRef.markForCheck();
  }
}
