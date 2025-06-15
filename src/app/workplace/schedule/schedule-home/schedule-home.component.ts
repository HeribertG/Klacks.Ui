import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { CreateHeaderService } from '../../../shared/grid/services/body/create-header.service';
import { CreateCellService } from '../schedule-section/services/create-cell.service';
import { CellRenderService } from '../schedule-section/services/cell-render.service';
import { CellManipulationService } from '../schedule-section/services/cell-manipulation.service';
import { CanvasManagerService } from '../schedule-section/services/canvas-manager.service';
import { BaseDrawRowHeaderService } from 'src/app/shared/grid/services/row-header/draw-row-header.service';
import { BaseCreateRowHeaderService } from 'src/app/shared/grid/services/row-header/create-row-header.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';
import { BaseGridRenderService } from 'src/app/shared/grid/services/body/grid-render.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  imports: [CommonModule, ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    BaseDataService,
    BaseSettingsService,
    ScrollService,
    CanvasManagerService,
    CellManipulationService,
    CellRenderService,
    CreateCellService,
    CreateHeaderService,
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    BaseDrawScheduleService,
    BaseGridRenderService,
    HolidayCollectionService,
    ScrollbarService,
  ],
})
export class ScheduleHomeComponent {
  @Input() isSchedule = false;
}
