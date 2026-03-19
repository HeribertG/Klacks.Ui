// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade-Service, der zusammengehörende Services der ScheduleSectionComponent bündelt.
 * @param contextMenu - Service für Kontextmenü-Erstellung im Schedule-Grid
 * @param entryActions - Service für Aktionen auf Schedule-Einträgen (Löschen, Bestätigen etc.)
 * @param dialog - Service für Dialog-Verwaltung (Korrektur, Vertretung, Bearbeitung)
 * @param dragDrop - Service für Drag-and-Drop-Operationen im Schedule
 * @param navigation - Service für Navigation innerhalb des Schedule-Grids
 * @param breakBarRender - Service für Break-Bar-Rendering im Grid-Overlay
 * @param gridRender - Service für Grid-Rendering und Overlay-Management
 * @param gridColor - Service für Grid-Farbverwaltung und Reset-Signale
 * @param tooltip - Service für Tooltip-Anzeige bei Zell-Hover
 * @param absenceMenu - Service für Abwesenheits-Menü-Daten
 * @param groupSelection - Service für globale Gruppenauswahl
 * @param workNotification - Service für Schedule-Update-Benachrichtigungen
 * @param showInSchedule - Service für "Im Plan anzeigen"-Navigation
 * @param workScheduleLoader - Service für Laden und Aktualisieren der Arbeitspläne
 * @param breakPlaceholderLoader - Service für Break-Placeholder-Verwaltung im Schedule
 * @param dataBreakPlaceholder - API-Service für Break-Placeholder-CRUD-Operationen
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
