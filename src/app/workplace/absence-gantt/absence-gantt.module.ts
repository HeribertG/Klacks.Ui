import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbsenceGanttHomeComponent } from './absence-gantt-home/absence-gantt-home.component';
import { AbsenceGanttSurfaceComponent } from './absence-gantt-surface/absence-gantt-surface.component';
import { AbsenceGanttRowHeaderComponent } from './absence-gantt-row-header/absence-gantt-row-header.component';
import { AbsenceGanttContainerComponent } from './absence-gantt-container/absence-gantt-container.component';
import { AbsenceGanttHeaderComponent } from './absence-gantt-header/absence-gantt-header.component';
import { AngularSplitModule } from 'angular-split';

import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { AbsenceCalendarDirective } from './directives/absence-calendar.directive';
import { AbsenceGanttAbsenceListComponent } from './absence-gantt-header/absence-gantt-absence-list/absence-gantt-absence-list.component';
import { AbsenceGanttMaskComponent } from './absence-gantt-mask/absence-gantt-mask.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { AbsenceGanttGridComponent } from './absence-gantt-mask/absence-gantt-grid/absence-gantt-grid.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { ResizeObserverDirective } from './directives/resize-observer.directive';
import { AbsenceGanttFilterComponent } from './absence-gantt-row-header/absence-gantt-filter/absence-gantt-filter.component';
import { AbsenceGanttPdfPreviewComponent } from './absence-gantt-pdf-preview/absence-gantt-pdf-preview.component';
import { DrawCalendarGanttService } from './services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from './services/draw-row-header.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RenderCalendarGridService } from './services/render-calendar-grid.service';
import { RenderRowHeaderCellService } from './services/render-row-header-cell.service';
import { GanttCanvasManagerService } from './services/gantt-canvas-manager.service';
import { RowHeaderCanvasManagerService } from './services/row-header-canvas.service';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { RenderRowHeaderService } from './services/render-row-header.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { CalendarIconComponent } from 'src/app/icons/calendar-icon.component';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';
import { TrashIconLightRedComponent } from 'src/app/icons/trash-icon-light-red.component ';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';
import { IconDescComponent } from 'src/app/icons/icon-desc.component';
import { IconAscComponent } from 'src/app/icons/icon-asc.component';
import { PdfIconComponent } from 'src/app/icons/pdf-icon.component';

@NgModule({
  declarations: [
    AbsenceGanttHomeComponent,
    AbsenceGanttSurfaceComponent,
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
    NgbModule,
    SharedModule,
    TranslateModule,
    FontAwesomeModule,
    NgxSliderModule,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    CalendarIconComponent,
    ChooseCalendarComponent,
    TrashIconLightRedComponent,
    GearGreyComponent,
    IconDescComponent,
    IconAscComponent,
    PdfIconComponent,
  ],
  providers: [
    TranslateService,
    CalendarSettingService,
    DrawCalendarGanttService,
    ScrollService,
    HolidayCollectionService,
    DrawRowHeaderService,
    RenderCalendarGridService,
    RenderRowHeaderCellService,
    GanttCanvasManagerService,
    RowHeaderCanvasManagerService,
    RenderRowHeaderService,
  ],
})
export class AbsenceGanttModule {}
