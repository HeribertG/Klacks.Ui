import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  effect,
  Injector,
  runInInjectionContext,
  EffectRef,
} from '@angular/core';
import { ScheduleHeaderComponent } from '../schedule-header/schedule-header.component';
import { ScheduleContainerComponent } from '../schedule-container/schedule-container.component';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { BaseCellRenderService } from '../../../shared/grid/services/body/cell-render.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';
import { WorkplaceStateService } from 'src/app/presentation/workplace/core/workplace-state.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/data-management-calendar-selection.service';
import { AllScheduleStateService } from '../../services/all-schedule-state.service';

@Component({
  selector: 'app-schedule-home',
  templateUrl: './schedule-home.component.html',
  styleUrls: ['./schedule-home.component.scss'],
  standalone: true,
  imports: [CommonModule, ScheduleHeaderComponent, ScheduleContainerComponent],
  providers: [
    { provide: BaseDataService, useClass: ScheduleDataService },
    ScrollService,
    BaseCellRenderService,
    HolidayCollectionService,
    ScrollbarService,
    BaseSettingsService,
    AllScheduleStateService,
  ],
})
export class ScheduleHomeComponent implements OnInit, OnDestroy {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private holidayCollection = inject(HolidayCollectionService);
  private dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private injector = inject(Injector);
  private allScheduleStateService = inject(AllScheduleStateService);

  public currentZoom = 1.0;
  public refreshTrigger = false;

  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.footerService.setFooterVisibility(false);
    this.layoutService.setContainerToFullSize();

    this.allScheduleStateService.initializeWorkplaceState();
    
    this.holidayCollection.readData();

    setTimeout(() => {
      const chips = this.dataManagementCalendarSelectionService.chips;
      if (chips && chips.length > 0) {
        this.holidayCollection.setSelection(chips);
      }
    }, 300);

    this.setupEffects();
  }

  ngOnDestroy(): void {
    this.effects.forEach((effect) => effect?.destroy());
    this.effects = [];
  }

  private setupEffects(): void {
    runInInjectionContext(this.injector, () => {
      const holidayEffect = effect(() => {
        if (this.holidayCollection.isReset()) {
          this.refreshTrigger = !this.refreshTrigger;
        }
      });
      this.effects.push(holidayEffect);
    });
  }

  onZoomChange(zoomValue: number) {
    this.currentZoom = zoomValue;
  }
}
