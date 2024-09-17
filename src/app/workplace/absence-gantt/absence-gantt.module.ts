import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbsenceGanttHomeComponent } from './absence-gantt-home/absence-gantt-home.component';
import { AbsenceGanttSurfaceComponent } from './absence-gantt-surface/absence-gantt-surface.component';
import { AbsenceGanttHScrollbarComponent } from './absence-gantt-h-scrollbar/absence-gantt-h-scrollbar.component';
import { AbsenceGanttVScrollbarComponent } from './absence-gantt-v-scrollbar/absence-gantt-v-scrollbar.component';
import { AbsenceGanttRowHeaderComponent } from './absence-gantt-row-header/absence-gantt-row-header.component';
import { AbsenceGanttContainerComponent } from './absence-gantt-container/absence-gantt-container.component';
import { AbsenceGanttHeaderComponent } from './absence-gantt-header/absence-gantt-header.component';
import { AngularSplitModule } from 'angular-split';

import { NgxSliderModule } from 'ngx-slider-v2';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { ScrollService } from 'src/app/workplace/absence-gantt/services/scroll.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { AbsenceCalendarDirective } from './directives/absence-calendar.directive';
import { AbsenceGanttAbsenceListComponent } from './absence-gantt-header/absence-gantt-absence-list/absence-gantt-absence-list.component';
import { AbsenceGanttMaskComponent } from './absence-gantt-mask/absence-gantt-mask.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { AbsenceGanttGridComponent } from './absence-gantt-mask/absence-gantt-grid/absence-gantt-grid.component';
import { IconsModule } from 'src/app/icons/icons.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { ResizeObserverDirective } from './directives/resize-observer.directive';
import { AbsenceGanttFilterComponent } from './absence-gantt-row-header/absence-gantt-filter/absence-gantt-filter.component';
import { AbsenceGanttPdfPreviewComponent } from './absence-gantt-pdf-preview/absence-gantt-pdf-preview.component';
import { DrawCalendarGanttService } from './services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from './services/draw-row-header.service';

@NgModule({
  declarations: [
    AbsenceGanttHomeComponent,
    AbsenceGanttSurfaceComponent,
    AbsenceGanttHScrollbarComponent,
    AbsenceGanttVScrollbarComponent,
    AbsenceGanttRowHeaderComponent,
    AbsenceGanttContainerComponent,
    AbsenceGanttHeaderComponent,
    ResizeObserverDirective,
    AbsenceCalendarDirective,
    AbsenceGanttAbsenceListComponent,
    AbsenceGanttMaskComponent,
    AbsenceGanttGridComponent,
    AbsenceGanttFilterComponent,
    AbsenceGanttPdfPreviewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    NgxSliderModule,
    NgbModule,
    SharedModule,
    IconsModule,
    TranslateModule,
  ],
  providers: [
    TranslateService,
    CalendarSettingService,
    DrawCalendarGanttService,
    ScrollService,
    HolidayCollectionService,
    DrawRowHeaderService,
  ],
})
export class AbsenceGanttModule {}
