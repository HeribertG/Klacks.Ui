/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// shift-section.component.ts
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { AngularSplitModule } from 'angular-split';
import { ScheduleShiftRowHeaderComponent } from './schedule-shift-row-header/schedule-shift-row-header.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/shared/grid/services/row-header/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/shared/grid/services/row-header/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';
import { BaseCanvasManagerService } from 'src/app/shared/grid/services/body/canvas-manager.service';
import { BaseCreateHeaderService } from 'src/app/shared/grid/services/body/create-header.service';
import { BaseCreateCellService } from 'src/app/shared/grid/services/body/create-cell.service';
import { BaseCellManipulationService } from 'src/app/shared/grid/services/body/cell-manipulation.service';
import { BaseCellRenderService } from 'src/app/shared/grid/services/body/cell-render.service';
import { ScheduleSurfaceTemplateComponent } from 'src/app/shared/grid/body/schedule-surface-template/schedule-surface-template.component';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';

@Component({
  selector: 'app-shift-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleShiftRowHeaderComponent,
    ContextMenuComponent,
    VScrollbarComponent,
    ScheduleSurfaceTemplateComponent,
  ],
  providers: [
    ScrollService,
    BaseCellManipulationService,
    BaseCellRenderService,
    BaseCreateCellService,
    BaseCreateHeaderService,
    BaseCreateRowHeaderService,
    BaseDrawRowHeaderService,
    BaseDrawScheduleService,
    BaseCanvasManagerService,
    BaseGridRenderService,
  ],
  templateUrl: './shift-section.component.html',
  styleUrls: ['./shift-section.component.scss'],
})
export class ShiftSectionComponent {
  @Input() horizontalSize!: number;
  @Input() hScrollbarValue!: number;
  @Input() hScrollbarMaxValue!: number;

  // public renderer = inject(BaseDrawScheduleService);
  // public dataService = inject(BaseDataService);
  // public settings = inject(BaseSettingsService);
  // public scrollService = inject(ScrollService);

  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;
}
