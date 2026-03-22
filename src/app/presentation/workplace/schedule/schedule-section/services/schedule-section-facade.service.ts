// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service that bundles related services of the ScheduleSectionComponent.
 * @param contextMenu - Service for context menu creation in the schedule grid
 * @param entryActions - Service for actions on schedule entries (delete, confirm, etc.)
 * @param dialog - Service for dialog management (correction, substitution, editing)
 * @param dragDrop - Service for drag-and-drop operations in the schedule
 * @param navigation - Service for navigation within the schedule grid
 * @param breakBarRender - Service for break bar rendering in the grid overlay
 * @param gridRender - Service for grid rendering and overlay management
 * @param gridColor - Service for grid color management and reset signals
 * @param tooltip - Service for tooltip display on cell hover
 * @param absenceMenu - Service for absence menu data
 * @param groupSelection - Service for global group selection
 * @param workNotification - Service for schedule update notifications
 * @param showInSchedule - Service for "show in schedule" navigation
 * @param workScheduleLoader - Service for loading and updating work schedules
 * @param breakPlaceholderLoader - Service for break placeholder management in the schedule
 * @param dataBreakPlaceholder - API service for break placeholder CRUD operations
 */
import { inject, Injectable } from '@angular/core';
import { ScheduleContextMenuService } from './schedule-context-menu.service';
import { ScheduleEntryActionsService } from './schedule-entry-actions.service';
import { ScheduleDialogService } from './schedule-dialog.service';
import { ScheduleDragDropService } from './schedule-drag-drop.service';
import { ScheduleNavigationService } from './schedule-navigation.service';
import { ScheduleBreakBarRenderService } from './schedule-break-bar-render.service';
import { BaseGridRenderService } from 'src/app/presentation/shared/grid/services/body/grid-render.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ScheduleTooltipService } from '../../services/schedule-tooltip.service';
import { AbsenceMenuService } from 'src/app/domain/services/schedule/absence-menu.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { WorkNotificationService } from 'src/app/domain/services/schedule/work-notification.service';
import { ShowInScheduleService } from '../../services/show-in-schedule.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { BreakPlaceholderScheduleLoaderService } from 'src/app/domain/services/schedule/break-placeholder-schedule-loader.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';

@Injectable()
export class ScheduleSectionFacadeService {
  readonly contextMenu = inject(ScheduleContextMenuService);
  readonly entryActions = inject(ScheduleEntryActionsService);
  readonly dialog = inject(ScheduleDialogService);
  readonly dragDrop = inject(ScheduleDragDropService);
  readonly navigation = inject(ScheduleNavigationService);
  readonly breakBarRender = inject(ScheduleBreakBarRenderService);
  readonly gridRender = inject(BaseGridRenderService);
  readonly gridColor = inject(GridColorService);
  readonly tooltip = inject(ScheduleTooltipService);
  readonly absenceMenu = inject(AbsenceMenuService);
  readonly groupSelection = inject(GroupSelectionService);
  readonly workNotification = inject(WorkNotificationService);
  readonly showInSchedule = inject(ShowInScheduleService);
  readonly workScheduleLoader = inject(WorkScheduleLoaderService);
  readonly breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  readonly dataBreakPlaceholder = inject(DataBreakPlaceholderService);
}
