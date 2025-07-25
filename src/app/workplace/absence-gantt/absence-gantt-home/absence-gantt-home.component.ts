import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AbsenceGanttHeaderComponent } from '../absence-gantt-header/absence-gantt-header.component';
import { AbsenceGanttContainerComponent } from '../absence-gantt-container/absence-gantt-container.component';
import { CalendarSettingService } from '../services/calendar-setting.service';
import { DrawCalendarGanttService } from '../services/draw-calendar-gantt.service';
import { GanttCanvasManagerService } from '../services/gantt-canvas-manager.service';
import { RenderCalendarGridService } from '../services/render-calendar-grid.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { RenderRowHeaderService } from '../services/render-row-header.service';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { RowHeaderCanvasManagerService } from '../services/row-header-canvas.service';
import { RenderRowHeaderCellService } from '../services/render-row-header-cell.service';
import { BreakLayerService } from '../services/break-layer.service';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';

@Component({
  selector: 'app-absence-gantt-home',
  templateUrl: './absence-gantt-home.component.html',
  styleUrls: ['./absence-gantt-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AbsenceGanttHeaderComponent,
    AbsenceGanttContainerComponent,
  ],
  providers: [
    CalendarSettingService,
    ScrollbarService,
    DrawCalendarGanttService,
    GanttCanvasManagerService,
    RenderCalendarGridService,
    DrawRowHeaderService,
    RenderRowHeaderService,
    ScrollService,
    RowHeaderCanvasManagerService,
    RenderRowHeaderCellService,
    BreakLayerService,
    HolidayCollectionService,
  ],
})
export class AbsenceGanttHomeComponent implements OnInit {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);

  ngOnInit(): void {
    this.footerService.setFooterVisibility(false);
    this.searchService.setSearchVisibility(true);
    
    // Set active manager for absence route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('absence');
    
    // Set full width for absence gantt
    this.layoutService.setContainerToFullSize();
  }
}
