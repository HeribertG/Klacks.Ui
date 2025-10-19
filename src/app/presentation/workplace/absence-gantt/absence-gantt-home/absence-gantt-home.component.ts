import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, viewChild } from '@angular/core';
import { AbsenceGanttHeaderComponent } from '../absence-gantt-header/absence-gantt-header.component';
import { AbsenceGanttContainerComponent } from '../absence-gantt-container/absence-gantt-container.component';
import { DrawCalendarGanttService } from '../services/draw-calendar-gantt.service';
import { GanttCanvasManagerService } from '../services/gantt-canvas-manager.service';
import { RenderCalendarGridService } from '../services/render-calendar-grid.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { RenderRowHeaderService } from '../services/render-row-header.service';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { RowHeaderCanvasManagerService } from '../services/row-header-canvas.service';
import { RenderRowHeaderCellService } from '../services/render-row-header-cell.service';
import { BreakLayerService } from '../services/break-layer.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { AllAbsenceStateService } from '../services/all-absence-state.service';
import { CalendarSettingService } from '../services/calendar-setting.service';
import { GanttPdfExportService } from '../services/gantt-pdf-export.service';
import { GanttPdfDrawingService } from '../services/gantt-pdf-drawing.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';

@Component({
  selector: 'app-absence-gantt-home',
  templateUrl: './absence-gantt-home.component.html',
  styleUrls: ['./absence-gantt-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AbsenceGanttHeaderComponent,
    AbsenceGanttContainerComponent,
  ],
  providers: [
    CalendarSettingService,
    ScrollbarService,
    DrawCalendarGanttService,
    GanttCanvasManagerService,
    RenderCalendarGridService,
    DrawRowHeaderService,
    RenderRowHeaderService,
    ScrollService,
    RowHeaderCanvasManagerService,
    RenderRowHeaderCellService,
    BreakLayerService,
    AllAbsenceStateService,
    DataManagementAbsenceGanttService,
    HolidayCollectionService,
    GanttPdfExportService,
    GanttPdfDrawingService,
  ],
})
export class AbsenceGanttHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private allAbsenceStateService = inject(AllAbsenceStateService);

  ganttContainer = viewChild.required<AbsenceGanttContainerComponent>('ganttContainer');

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();
    this.allAbsenceStateService.initializeWorkplaceState();
  }

  async onPdfExportRequested(): Promise<void> {
    // Delegiere an Container-Komponente
    await this.ganttContainer().onPdfExportRequested();
  }
}
