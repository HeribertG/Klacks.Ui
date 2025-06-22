import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/shared/grid/services/data-setting/settings.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  imports: [CommonModule, ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    ScrollService,
    BaseCellRenderService,
    HolidayCollectionService,
    ScrollbarService,
    BaseDataService,
    BaseSettingsService,
  ],
})
export class ScheduleHomeComponent {
  @Input() isSchedule = false;

  public currentZoom = 1.0;

  onZoomChange(zoomValue: number) {
    this.currentZoom = zoomValue;
  }
}
