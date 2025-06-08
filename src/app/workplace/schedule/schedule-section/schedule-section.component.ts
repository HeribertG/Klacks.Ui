import {
  Component,
  ViewChild,
  inject,
  AfterViewInit,
  EventEmitter,
  Output,
  Input,
} from '@angular/core';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { ScheduleScheduleSurfaceComponent } from '../schedule-schedule-surface/schedule-schedule-surface.component';
import { HScrollbarComponent } from 'src/app/shared/h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from 'src/app/shared/v-scrollbar/v-scrollbar.component';
import { DataManagementScheduleService } from 'src/app/data/management/data-management-schedule.service';
import { GridRenderService } from './services/grid-render.service';
import { DrawScheduleService } from './services/draw-schedule.service';
import { DrawRowHeaderService } from './services/draw-row-header.service';
import { CreateRowHeaderService } from './services/create-row-header.service';
import { CreateHeaderService } from './services/create-header.service';
import { CreateCellService } from './services/create-cell.service';
import { CellRenderService } from './services/cell-render.service';
import { CellManipulationService } from './services/cell-manipulation.service';
import { CanvasManagerService } from './services/canvas-manager.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { DataService } from './services/data.service';

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
    DataService,
    ScrollService,
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
  templateUrl: './schedule-section.component.html',
  styleUrls: ['./schedule-section.component.scss'],
})
export class ScheduleSectionComponent implements AfterViewInit {
  @ViewChild('splitEl', { static: true }) splitEl!: SplitComponent;
  @Input() horizontalSize = 200;
  @Output() horizontalSizeChange = new EventEmitter<number>();
  public hScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };
  public vScrollbar = { value: 0, maxValue: 0, visibleValue: 0 };

  private dataManagement = inject(DataManagementScheduleService);

  ngAfterViewInit() {
    this.dataManagement.readDatas();

    // Passe Breite des linken Bereichs an
    this.splitEl.dragProgress$.subscribe((x) => {
      const newSize = x.sizes[0] as number;
      this.horizontalSizeChange.emit(newSize);
    });
  }
}
