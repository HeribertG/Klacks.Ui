import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { GridRenderService } from '../schedule-section/services/grid-render.service';
import { DrawScheduleService } from '../schedule-section/services/draw-schedule.service';
import { DrawRowHeaderService } from '../schedule-section/services/draw-row-header.service';
import { CreateRowHeaderService } from '../schedule-section/services/create-row-header.service';
import { CreateHeaderService } from '../schedule-section/services/create-header.service';
import { CreateCellService } from '../schedule-section/services/create-cell.service';
import { CellRenderService } from '../schedule-section/services/cell-render.service';
import { CellManipulationService } from '../schedule-section/services/cell-manipulation.service';
import { CanvasManagerService } from '../schedule-section/services/canvas-manager.service';
import { SettingsService } from '../schedule-section/services/settings.service';
import { DataService } from '../schedule-section/services/data.service';

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
    HolidayCollectionService,
    ScrollbarService,
  ],
})
export class ScheduleHomeComponent {
  @Input() isSchedule = false;
}
