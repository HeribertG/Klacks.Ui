// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { AfterViewInit, Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PeriodResetData } from 'src/app/presentation/shared/period-calendar-monthly/period-calendar-monthly.component';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { ClientAvailabilityHeaderComponent } from '../client-availability-header/client-availability-header.component';
import { ClientAvailabilityContainerComponent } from '../client-availability-container/client-availability-container.component';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilityCanvasManagerService } from '../services/availability-canvas-manager.service';
import { DrawAvailabilityGridService } from '../services/draw-availability-grid.service';
import { DrawAvailabilityRowHeaderService } from '../services/draw-availability-row-header.service';
import { SharedRowHeaderCanvasManagerService } from 'src/app/presentation/shared/grid/row-header/row-header-canvas-manager.service';
import { SharedRenderRowHeaderCellService } from 'src/app/presentation/shared/grid/row-header/render-row-header-cell.service';
import { SharedRenderRowHeaderService } from 'src/app/presentation/shared/grid/row-header/render-row-header.service';
import { ROW_HEADER_SETTINGS, ROW_HEADER_DATA } from 'src/app/presentation/shared/grid/row-header/row-header-tokens';
import { AvailabilityRowHeaderDataAdapter } from '../services/availability-row-header-data-adapter.service';
import {
  RenderAvailabilityGridService,
  AvailabilityCalculationService,
  AvailabilityHeaderRenderingService,
  AvailabilityCellRenderingService,
  CheckboxDrawingService,
} from '../services/render-availability-grid';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { DataClientService, IClientForReplacement } from 'src/app/infrastructure/api/client/data-client.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollbarService } from 'src/app/presentation/shared/scrollbar/scrollbar.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SearchStrategyService } from 'src/app/presentation/search/search-strategy.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ClientAvailabilityFilterService } from 'src/app/domain/services/client-availability/client-availability-filter.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { SearchService } from 'src/app/application/services/search.service';
import { AvailabilitySelectionService } from '../services/availability-selection.service';
import { formatClientDisplayName } from 'src/app/shared/helpers/client-name.helper';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';

@Component({
  selector: 'app-client-availability-home',
  templateUrl: './client-availability-home.component.html',
  styleUrls: ['./client-availability-home.component.scss'],
  standalone: true,
  imports: [
    ClientAvailabilityHeaderComponent,
    ClientAvailabilityContainerComponent,
  ],
  providers: [
    AvailabilitySettingService,
    AvailabilityCanvasManagerService,
    DrawAvailabilityGridService,
    RenderAvailabilityGridService,
    AvailabilityCalculationService,
    AvailabilityHeaderRenderingService,
    AvailabilityCellRenderingService,
    CheckboxDrawingService,
    DrawAvailabilityRowHeaderService,
    SharedRowHeaderCanvasManagerService,
    SharedRenderRowHeaderCellService,
    SharedRenderRowHeaderService,
    { provide: ROW_HEADER_SETTINGS, useExisting: AvailabilitySettingService },
    { provide: ROW_HEADER_DATA, useClass: AvailabilityRowHeaderDataAdapter },
    DataManagementClientAvailabilityService,
    ProgressBarAnimationService,
    ScrollService,
    ScrollbarService,
    ClientAvailabilityFilterService,
    HolidayCollectionService,
    AvailabilitySelectionService,
  ],
})
export class ClientAvailabilityHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private dataClientService = inject(DataClientService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private calculation = inject(AvailabilityCalculationService);
  private settings = inject(AvailabilitySettingService);
  private workplaceState = inject(WorkplaceStateService);
  private searchStrategy = inject(SearchStrategyService);
  private groupSelection = inject(GroupSelectionService);
  private filterService = inject(ClientAvailabilityFilterService);
  private searchService = inject(SearchService);
  private holidayCollection = inject(HolidayCollectionService);
  private calendarUtil = inject(CalendarUtilService);
  private appSettingsService = inject(AppSettingsManagementService);

  header = viewChild.required<ClientAvailabilityHeaderComponent>('header');
  container = viewChild.required<ClientAvailabilityContainerComponent>('container');

  get viewMode(): PaymentInterval {
    return this.resolvePaymentInterval();
  }

  private resolvePaymentInterval(): PaymentInterval {
    const group = this.groupSelection.selectedGroup;
    return group?.paymentInterval
      ?? this.appSettingsService.workSettings().paymentInterval;
  }

  private applyViewMode(): void {
    this.settings.viewMode.set(this.resolvePaymentInterval());
  }

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.layoutService.setContainerToFullSize();
    this.searchService.setSearchVisibility(true);

    this.workplaceState.setNameOfVisibleEntity(EntityName.CLIENT_AVAILABILITY);
    this.workplaceState.isFocusChanged.set(true);

    this.searchStrategy.addStrategy(EntityName.CLIENT_AVAILABILITY, {
      search: (value: string) => {
        this.filterService.searchString = value;
        this.applyFilterAndRender();
      },
      resetFilter: () => {
        this.filterService.searchString = '';
        this.applyFilterAndRender();
      },
      getEntityName: () => EntityName.CLIENT_AVAILABILITY,
    });

    this.groupSelection.registerClientAvailabilityCallback((groupId) => {
      this.filterService.selectedGroupId = groupId;
      this.applyViewMode();
      this.applyFilterAndRender();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await Promise.all([
      this.gridColors.readDataAsync(),
      this.gridFonts.readDataAsync(),
      this.holidayCollection.readDataAsync(),
    ]);

    this.renderGrid.initialize();
    this.applyViewMode();
    this.setStartDate();

    const clients = await firstValueFrom(
      this.dataClientService.getClientsForReplacement()
    );

    const mapped = clients.map((c: IClientForReplacement) => ({
      id: c.id,
      displayName: formatClientDisplayName(c),
      groupIds: c.groupIds ?? [],
      legalEntity: c.legalEntity,
      name: c.name ?? '',
      firstName: c.firstName ?? '',
      company: c.company ?? '',
    }));

    this.filterService.setAllClients(mapped);
    this.filterService.selectedGroupId = this.groupSelection.selectedGroupId;

    const filtered = this.filterService.getFilteredClients();
    this.renderGrid.setClients(
      filtered.map((c) => ({ id: c.id, displayName: c.displayName }))
    );

    await this.loadAvailabilityData();
  }

  ngOnDestroy(): void {
    this.searchStrategy.removeStrategy(EntityName.CLIENT_AVAILABILITY);
    this.groupSelection.unregisterClientAvailabilityCallback();
  }

  async onSaveRequested(): Promise<void> {
    await this.dataManagement.saveChanges();
  }

  async onPeriodChanged(data: PeriodResetData): Promise<void> {
    this.setStartDateFromPeriod(data);
    await this.loadAvailabilityData();
  }

  private applyFilterAndRender(): void {
    this.filterService.reFilter((filtered) => {
      this.renderGrid.setClients(
        filtered.map((c) => ({ id: c.id, displayName: c.displayName }))
      );
    });
  }

  private setStartDate(): void {
    const now = new Date();
    const week = this.calendarUtil.getISO8601WeekNumber(now);
    this.calculation.startDate = this.calendarUtil.getWeekStartDate(now.getFullYear(), week);
  }

  private setStartDateFromPeriod(data: PeriodResetData): void {
    if (data.week !== undefined) {
      this.calculation.startDate = this.calendarUtil.getWeekStartDate(data.year, data.week);
    } else if (data.month !== undefined) {
      this.calculation.startDate = new Date(data.year, data.month - 1, 1);
    }
  }

  private async loadAvailabilityData(): Promise<void> {
    const startDate = this.calculation.formatDateOnly(this.calculation.startDate);
    const endDate = this.getEndDate();
    await this.dataManagement.readDataAsync(startDate, endDate);
  }

  private getEndDate(): string {
    const end = new Date(this.calculation.startDate);
    end.setDate(end.getDate() + this.calculation.daysInView - 1);
    return this.calculation.formatDateOnly(end);
  }
}
