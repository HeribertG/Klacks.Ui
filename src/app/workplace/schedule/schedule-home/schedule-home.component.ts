import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { DataService } from '../services/data.service';
import { ScrollService } from '../services/scroll.service';
import { SettingsService } from '../services/settings.service';
import { CanvasManagerService } from '../services/canvas-manager.service';
import { CellManipulationService } from '../services/cell-manipulation.service';
import { CellRenderService } from '../services/cell-render.service';
import { CreateCellService } from '../services/create-cell.service';
import { CreateHeaderService } from '../services/create-header.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { CreateRowHeaderService } from '../services/create-row-header.service';
import { DrawScheduleService } from '../services/draw-schedule.service';
import { GridRenderService } from '../services/grid-render.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  imports: [CommonModule, ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    DataService,
    ScrollService,
    SettingsService,
    CanvasManagerService,
    CellManipulationService,
    CellRenderService,
    CreateCellService,
    CreateHeaderService,
    CreateRowHeaderService,
    DrawRowHeaderService,
    DrawScheduleService,
    GridRenderService,
  ],
})
export class ScheduleHomeComponent {
  @Input() isSchedule = false;
}
