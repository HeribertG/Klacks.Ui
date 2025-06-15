import {
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  EventEmitter,
  Output,
  Input,
  effect,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { ScheduleScheduleSurfaceComponent } from '../schedule-schedule-surface/schedule-schedule-surface.component';
import { HScrollbarComponent } from 'src/app/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { CreateHeaderService } from '../../../shared/grid/services/body/create-header.service';
import { CreateCellService } from './services/create-cell.service';
import { CellRenderService } from './services/cell-render.service';
import { CellManipulationService } from './services/cell-manipulation.service';
import { CanvasManagerService } from './services/canvas-manager.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseCreateRowHeaderService } from 'src/app/shared/grid/services/row-header/create-row-header.service';
import { BaseDrawRowHeaderService } from 'src/app/shared/grid/services/row-header/draw-row-header.service';
import { BaseGridRenderService } from 'src/app/shared/grid/services/body/grid-render.service';
import { BaseDrawScheduleService } from 'src/app/shared/grid/services/body/draw-schedule.service';

@Component({
  selector: 'app-schedule-section',
  standalone: true,
  imports: [
    AngularSplitModule,
    ScheduleScheduleRowHeaderComponent,
    ScheduleScheduleSurfaceComponent,
    HScrollbarComponent,
    VScrollbarComponent,
  ],
  providers: [
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
  ],
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
})
export class ScheduleSectionComponent implements AfterViewInit {
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @Input() horizontalSize = 200;
  @Output() horizontalSizeChange = new EventEmitter<number>();
  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbarSize = 17;
  public hScrollbarSize = 17;

  private dataManagement = inject(DataManagementScheduleService);
  private scrollService = inject(ScrollService);

  private defaultVScrollbarSize = 17;
  private defaultHScrollbarSize = 17;

  constructor() {
    effect(() => {
      const isLocked = this.scrollService.lockedRows();
      this.vScrollbarSize = isLocked ? 0 : this.defaultVScrollbarSize;
      this.updateScrollbarSizes();
    });

    effect(() => {
      const isLocked = this.scrollService.lockedCols();
      this.hScrollbarSize = isLocked ? 0 : this.defaultHScrollbarSize;
      this.updateScrollbarSizes();
    });
  }

  ngAfterViewInit() {
    this.dataManagement.readDatas();

    this.splitEl.dragProgress$.subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize);
    });
  }

  private updateScrollbarSizes() {
    const hostElement = document.querySelector(
      'app-schedule-section'
    ) as HTMLElement;
    if (hostElement) {
      hostElement.style.setProperty(
        '--v-scrollbar-size',
        `${this.vScrollbarSize}px`
      );
      hostElement.style.setProperty(
        '--h-scrollbar-size',
        `${this.hScrollbarSize}px`
      );
    }
  }
}
