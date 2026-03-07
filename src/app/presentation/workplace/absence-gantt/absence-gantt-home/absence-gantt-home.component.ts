// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import { AfterViewInit, Component, inject, OnInit, viewChild } from '@angular/core';
import { AbsenceGanttHeaderComponent } from '../absence-gantt-header/absence-gantt-header.component';
import { AbsenceGanttContainerComponent } from '../absence-gantt-container/absence-gantt-container.component';
import { DrawCalendarGanttService } from '../services/draw-calendar-gantt.service';
import { GanttCanvasManagerService } from '../services/gantt-canvas-manager.service';
import {
  RenderCalendarGridService,
  CalendarCalculationService,
  CalendarDayRenderingService,
  CalendarMonthRenderingService,
  CalendarHeaderRenderingService,
  ValidityPeriodRenderingService,
  BreakRenderingService,
  RowSelectionService
} from '../services/render-calendar-grid';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { SharedRowHeaderCanvasManagerService } from 'src/app/presentation/shared/grid/row-header/row-header-canvas-manager.service';
import { SharedRenderRowHeaderCellService } from 'src/app/presentation/shared/grid/row-header/render-row-header-cell.service';
import { SharedRenderRowHeaderService } from 'src/app/presentation/shared/grid/row-header/render-row-header.service';
import { ROW_HEADER_SETTINGS, ROW_HEADER_DATA } from 'src/app/presentation/shared/grid/row-header/row-header-tokens';
import { GanttRowHeaderDataAdapter } from '../services/gantt-row-header-data-adapter.service';
import { BreakLayerService } from '../services/break-layer.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { AllAbsenceStateService } from '../services/all-absence-state.service';
import { CalendarSettingService } from '../services/calendar-setting.service';
import { GanttPdfExportService } from '../services/gantt-pdf-export.service';
import { GanttPdfDrawingService } from '../services/gantt-pdf-drawing.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { lastValueFrom } from 'rxjs';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { AbsenceGanttDragDropService } from '../services/absence-gantt-drag-drop.service';
import { AbsenceGanttContextMenuService } from '../services/absence-gantt-context-menu.service';

@Component({
  selector: 'app-absence-gantt-home',
  templateUrl: './absence-gantt-home.component.html',
  styleUrls: ['./absence-gantt-home.component.scss'],
  standalone: true,
  imports: [
    AbsenceGanttHeaderComponent,
    AbsenceGanttContainerComponent
],
  providers: [
    CalendarSettingService,
    ScrollbarService,
    DrawCalendarGanttService,
    GanttCanvasManagerService,
    RenderCalendarGridService,
    CalendarCalculationService,
    CalendarDayRenderingService,
    CalendarMonthRenderingService,
    CalendarHeaderRenderingService,
    ValidityPeriodRenderingService,
    BreakRenderingService,
    RowSelectionService,
    DrawRowHeaderService,
    SharedRenderRowHeaderService,
    ScrollService,
    SharedRowHeaderCanvasManagerService,
    SharedRenderRowHeaderCellService,
    { provide: ROW_HEADER_SETTINGS, useExisting: CalendarSettingService },
    { provide: ROW_HEADER_DATA, useClass: GanttRowHeaderDataAdapter },
    BreakLayerService,
    AllAbsenceStateService,
    DataManagementAbsenceGanttService,
    HolidayCollectionService,
    GanttPdfExportService,
    GanttPdfDrawingService,
    ProgressBarAnimationService,
    AbsenceGanttDragDropService,
    AbsenceGanttContextMenuService,
  ],
})
export class AbsenceGanttHomeComponent implements OnInit, AfterViewInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private allAbsenceStateService = inject(AllAbsenceStateService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private holidayCollection = inject(HolidayCollectionService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);
  private groupSelectionService = inject(GroupSelectionService);
  private appSettingsService = inject(AppSettingsManagementService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);

  ganttHeader = viewChild.required<AbsenceGanttHeaderComponent>('ganttHeader');
  ganttContainer = viewChild.required<AbsenceGanttContainerComponent>('ganttContainer');

  async ngOnInit(): Promise<void> {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();
    await this.allAbsenceStateService.initializeWorkplaceState();
  }

  async ngAfterViewInit(): Promise<void> {
    await Promise.all([
      this.gridColors.readDataAsync(),
      this.gridFonts.readDataAsync(),
      this.holidayCollection.readDataAsync(),
      this.dataManagementAbsence.readDataAsync(),
    ]);

    const chips = await this.resolveCalendarChips();
    if (chips.length > 0) {
      this.holidayCollection.setSelection(chips);
    }

    await this.ganttHeader().initAsync();
  }

  private async resolveCalendarChips(): Promise<StateCountryToken[]> {
    const calendarSelectionId =
      this.groupSelectionService.selectedGroup?.calendarSelectionId ||
      this.appSettingsService.contactSettings().globalCalendarSelectionId;

    if (!calendarSelectionId) {
      return [];
    }

    try {
      const selection = await lastValueFrom(
        this.dataCalendarSelectionService.getCalendarSelection(calendarSelectionId)
      );

      if (!selection?.selectedCalendars?.length) {
        return [];
      }

      return selection.selectedCalendars.map((sc) => {
        const token = new StateCountryToken();
        token.country = sc.country;
        token.state = sc.state;
        return token;
      });
    } catch {
      return [];
    }
  }

  async onPdfExportRequested(): Promise<void> {
    // Delegiere an Container-Komponente
    await this.ganttContainer().onPdfExportRequested();
  }
}
