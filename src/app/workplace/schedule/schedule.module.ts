import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleHomeComponent } from './schedule-home/schedule-home.component';
import { ScheduleContainerComponent } from './schedule-container/schedule-container.component';
import { ScheduleHScrollbarComponent } from './schedule-h-scrollbar/schedule-h-scrollbar.component';
import { ScheduleHeaderComponent } from './schedule-header/schedule-header.component';
import { ScheduleScheduleSurfaceComponent } from './schedule-schedule-surface/schedule-schedule-surface.component';
import { ScheduleScheduleRowHeaderComponent } from './schedule-schedule-row-header/schedule-schedule-row-header.component';
import { ScheduleShiftSurfaceComponent } from './schedule-shift-surface/schedule-shift-surface.component';
import { ScheduleShiftRowHeaderComponent } from './schedule-shift-row-header/schedule-shift-row-header.component';
import { ScheduleVScrollbarComponent } from './schedule-v-scrollbar/schedule-v-scrollbar.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { IconsModule } from 'src/app/icons/icons.module';
import { AngularSplitModule } from 'angular-split';
import { FormsModule } from '@angular/forms';
import { ResizeObserverDirective } from './directives/resize-observer.directive';
import { ScrollService } from './services/scroll.service';
import { SettingsService } from './services/settings.service';
import { DataService } from './services/data.service';
import { DrawScheduleService } from './services/draw-schedule.service';
import { CellManipulationService } from './services/cell-manipulation.service';
import { CreateHeaderService } from './services/create-header.service';
import { CreateCellService } from './services/create-cell.service';
import { CreateRowHeaderService } from './services/create-row-header.service';
import { ScheduleHeaderCalendarComponent } from './schedule-header/schedule-header-calendar/schedule-header-calendar.component';
import { DrawRowHeaderService } from './services/draw-row-header.service';
import { CellEventsDirective } from './directives/cell-events.directive';
import { CanvasManagerService } from './services/canvas-manager.service';

@NgModule({
  declarations: [
    ScheduleHomeComponent,
    ScheduleContainerComponent,
    ScheduleHScrollbarComponent,
    ScheduleHeaderComponent,
    ScheduleScheduleSurfaceComponent,
    ScheduleScheduleRowHeaderComponent,
    ScheduleShiftSurfaceComponent,
    ScheduleShiftRowHeaderComponent,
    ScheduleVScrollbarComponent,
    ResizeObserverDirective,
    CellEventsDirective,
    ScheduleHeaderCalendarComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    NgbModule,
    SharedModule,
    IconsModule,
    TranslateModule,
  ],
  providers: [
    TranslateService,
    SettingsService,
    ScrollService,
    HolidayCollectionService,
    DataService,
    DrawScheduleService,
    CellManipulationService,
    CreateHeaderService,
    CreateCellService,
    CreateRowHeaderService,
    DrawRowHeaderService,
    CanvasManagerService,
  ],
})
export class ScheduleModule {}
