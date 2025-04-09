import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbsenceGanttHeaderComponent } from '../absence-gantt-header/absence-gantt-header.component';
import { AbsenceGanttContainerComponent } from '../absence-gantt-container/absence-gantt-container.component';
import { CalendarSettingService } from '../services/calendar-setting.service';
import { DrawCalendarGanttService } from '../services/draw-calendar-gantt.service';
import { GanttCanvasManagerService } from '../services/gantt-canvas-manager.service';
import { RenderCalendarGridService } from '../services/render-calendar-grid.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { RenderRowHeaderService } from '../services/render-row-header.service';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { RowHeaderCanvasManagerService } from '../services/row-header-canvas.service';
import { RenderRowHeaderCellService } from '../services/render-row-header-cell.service';

@Component({
  selector: 'app-absence-gantt-home',
  templateUrl: './absence-gantt-home.component.html',
  styleUrls: ['./absence-gantt-home.component.scss'],
  standalone: true,
  imports: [NgIf, AbsenceGanttHeaderComponent, AbsenceGanttContainerComponent],
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
  ],
})
export class AbsenceGanttHomeComponent {
  @Input() isAbsence: boolean = false;
}
