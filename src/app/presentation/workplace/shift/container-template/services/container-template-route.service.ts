// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for route optimization, autofill and transport mode management in container templates.
 * @param routeOptimizationService - API service for route optimization and autofill calls
 * @param containerService - Manages container template data (weekday numbers, template updates)
 * @param shiftService - Manages selected shifts and container template items
 * @param itemManipulationService - Applies optimized route data to template items
 * @param addressProvider - Provides address lookup for start/end base resolution
 * @param appSettingsService - Provides OpenRouteService API key availability
 */
import { Injectable, inject } from '@angular/core';
import { Subject, TimeoutError } from 'rxjs';
import { takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift-class';
import {
  IContainerTemplateItem,
  IRouteInfo,
} from 'src/app/domain/models/container/container-template-class';
import {
  ContainerTransportModeEnum,
} from 'src/app/domain/enums/transport-mode.enum';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';
import { RouteOptimizationService } from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { newGuid } from 'src/app/shared/helpers/guid.helper';
import {
  timeToString,
  timeToMinutes,
} from 'src/app/shared/helpers/time-format.helper';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

@Injectable()
export class ContainerTemplateRouteService {
  private routeOptimizationService = inject(RouteOptimizationService);
  private containerService = inject(DataManagementContainerService);
  private shiftService = inject(ContainerTemplateShiftService);
  private itemManipulationService = inject(ContainerTemplateItemManipulationService);
  private toastService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private spinnerService = inject(SpinnerService);
  private workplaceStateService = inject(WorkplaceStateService);
  private addressProvider = inject(AddressProviderService);
  private appSettingsService = inject(AppSettingsManagementService);
  private sortingService = inject(TableSortingService);

  public selectedStartBase = '';
  public selectedEndBase = '';
  public selectedTransportMode: ContainerTransportModeEnum =
    ContainerTransportModeEnum.byCar;
  public lastRouteInfo: IRouteInfo | null = null;
  public isAutofillRunning = false;
  public isOptimizing = false;

  get hasRouteInfo(): boolean {
    return this.lastRouteInfo !== null;
  }

  get hasOpenRouteServiceApiKey(): boolean {
    return !!this.appSettingsService.openRouteServiceApiKey();
  }

  get isTransportModeMix(): boolean {
    return this.selectedTransportMode === ContainerTransportModeEnum.mix;
  }

  autofill(
    containerShift: IShift | null,
    selectedWeekday: string | null,
    isHoliday: boolean,
    timeFrom: OwnTime,
    timeTo: OwnTime,
    availableTasks: IShift[],
    timeRangeToleranceValue: number,
    destroy$: Subject<void>,
  ): void {
    if (!this.selectedStartBase || !this.selectedEndBase) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.autofill-no-base',
        ),
      );
      return;
    }

    if (!containerShift?.id || !selectedWeekday) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.no-container-weekday',
        ),
      );
      return;
    }

    const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);

    this.isAutofillRunning = true;

    const containerFromTime = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const containerUntilTime = timeToString(
      parseInt(timeTo.hours),
      parseInt(timeTo.minutes),
    );

    this.routeOptimizationService
      .autofill(
        containerShift.id,
        weekdayNumber,
        isHoliday,
        this.selectedStartBase,
        this.selectedEndBase,
        containerFromTime,
        containerUntilTime,
        this.selectedTransportMode,
        timeRangeToleranceValue / 100,
      )
      .pipe(takeUntil(destroy$))
      .subscribe({
        next: (result) => {
          this.isAutofillRunning = false;

          if (result.selectedShiftCount === 0) {
            this.toastService.showInfo(
              this.translateService.instant(
                'shift.container-template.toast.autofill-no-shifts',
              ),
            );
            return;
          }

          const newItems = this.convertAutofillResultToItems(
            result.selectedShiftIds,
            availableTasks,
          );

          this.lastRouteInfo = {
            startBase: this.selectedStartBase,
            endBase: this.selectedEndBase,
            totalDistanceKm: result.totalDistanceKm,
            estimatedTravelTime: result.estimatedTravelTime,
            travelTimeFromStartBase: result.travelTimeFromStartBase,
            distanceFromStartBaseKm: result.distanceFromStartBaseKm,
            distanceToEndBaseKm: result.distanceToEndBaseKm,
            travelTimeToEndBase: result.travelTimeToEndBase,
            optimizedRoute: result.optimizedRoute,
            segmentDirections: result.segmentDirections,
          };

          this.saveRouteInfoToTemplate(selectedWeekday, isHoliday);
          this.applyOptimizedRoute(result, newItems, timeFrom, selectedWeekday, isHoliday);
          this.toastService.showSuccess(
            this.translateService.instant(
              'shift.container-template.toast.autofill-success',
              {
                selected: result.selectedShiftCount,
                total: result.totalAvailableShifts,
                distance: result.totalDistanceKm.toFixed(2),
              },
            ),
            'Autofill',
          );
        },
        error: (error) => {
          this.isAutofillRunning = false;
          console.error('Autofill failed:', error);
          const message = error instanceof TimeoutError
            ? this.translateService.instant('shift.container-template.toast.autofill-timeout')
            : error.error || error.message || error.statusText || 'Unknown error';
          this.toastService.showError(message, 'autofill-error');
        },
      });
  }

  convertAutofillResultToItems(
    selectedShiftIds: string[],
    availableTasks: IShift[],
  ): IContainerTemplateItem[] {
    const items: IContainerTemplateItem[] = [];

    for (const shiftId of selectedShiftIds) {
      const shift = availableTasks.find((t) => t.id === shiftId);
      if (shift) {
        items.push(this.convertShiftToContainerTemplateItem(shift));
      }
    }

    return items;
  }

  optimizeRoute(
    selectedWeekday: string | null,
    isHoliday: boolean,
    timeFrom: OwnTime,
    destroy$: Subject<void>,
  ): void {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();

    if (items.length < 2) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.min-shifts-required',
        ),
      );
      return;
    }

    const shiftIds = items
      .filter((item) => item.shiftId)
      .map((item) => item.shiftId!);

    this.isOptimizing = true;
    this.toastService.showInfo(
      this.translateService.instant(
        'shift.container-template.toast.optimizing-route',
      ),
      '',
      '',
      TOAST_ICONS.ROUTE,
    );

    this.routeOptimizationService
      .optimizeRoute(
        shiftIds,
        this.selectedStartBase || undefined,
        this.selectedEndBase || undefined,
        this.selectedTransportMode,
      )
      .pipe(takeUntil(destroy$))
      .subscribe({
        next: (result) => {
          this.isOptimizing = false;

          this.lastRouteInfo = {
            startBase: this.selectedStartBase,
            endBase: this.selectedEndBase,
            totalDistanceKm: result.totalDistanceKm,
            estimatedTravelTime: result.estimatedTravelTime,
            travelTimeFromStartBase: result.travelTimeFromStartBase,
            distanceFromStartBaseKm: result.distanceFromStartBaseKm,
            distanceToEndBaseKm: result.distanceToEndBaseKm,
            travelTimeToEndBase: result.travelTimeToEndBase,
            optimizedRoute: result.optimizedRoute,
            segmentDirections: result.segmentDirections,
          };

          this.saveRouteInfoToTemplate(selectedWeekday, isHoliday);
          if (selectedWeekday) {
            this.applyOptimizedRoute(result, items, timeFrom, selectedWeekday, isHoliday);
          }
          this.toastService.showSuccess(
            this.translateService.instant(
              'shift.container-template.toast.route-optimized-details',
              {
                distance: result.totalDistanceKm.toFixed(2),
                time: result.estimatedTravelTime,
              },
            ),
            this.translateService.instant(
              'shift.container-template.toast.route-optimized',
            ),
          );
        },
        error: (error) => {
          this.isOptimizing = false;
          console.error('Route optimization failed:', error);
          this.toastService.showError(
            error.message || error.statusText || 'Unknown error',
            'route-optimization-error',
          );
        },
      });
  }

  applyOptimizedRoute(
    result: any,
    currentItems: IContainerTemplateItem[],
    timeFrom: OwnTime,
    selectedWeekday: string,
    isHoliday: boolean,
  ): void {
    const startTimeString = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );
    const containerStartTimeMinutes = timeToMinutes(startTimeString);

    const reorderedItems = this.itemManipulationService.applyOptimizedRoute(
      {
        optimizedRoute: result.optimizedRoute,
        travelTimeFromStartBase: result.travelTimeFromStartBase,
        travelTimeToEndBase: result.travelTimeToEndBase,
        distanceToEndBaseKm: result.distanceToEndBaseKm,
      },
      currentItems,
      containerStartTimeMinutes,
    );

    if (reorderedItems.length > 0) {
      const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);

      this.shiftService.setSelectedContainerTemplateItems(reorderedItems);
      this.containerService.updateTaskOrderInTemplates(
        reorderedItems,
        weekdayNumber,
        isHoliday,
      );
      this.workplaceStateService.areObjectsDirty();

      this.sortingService.restoreSortState('startShift', 'asc');
    }
  }

  saveRouteInfoToTemplate(
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (!selectedWeekday || !this.lastRouteInfo) {
      return;
    }

    const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
    this.containerService.updateRouteInfo(
      weekdayNumber,
      isHoliday,
      this.lastRouteInfo,
    );
    this.workplaceStateService.areObjectsDirty();
  }

  loadStartEndBaseForCurrentTemplate(
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
      const template = this.containerService.getTemplateForWeekday(
        weekdayNumber,
        isHoliday,
      );
      if (template) {
        let startBaseAddress = this.addressProvider
          .allAddresses()
          .find((a) => a.name === template.startBase);
        if (!startBaseAddress) {
          startBaseAddress = this.addressProvider
            .allAddresses()
            .find((a) => a.address === template.startBase);
        }

        let endBaseAddress = this.addressProvider
          .allAddresses()
          .find((a) => a.name === template.endBase);
        if (!endBaseAddress) {
          endBaseAddress = this.addressProvider
            .allAddresses()
            .find((a) => a.address === template.endBase);
        }

        this.selectedStartBase = startBaseAddress?.address || '';
        this.selectedEndBase = endBaseAddress?.address || '';
        this.selectedTransportMode =
          template.transportMode ?? ContainerTransportModeEnum.byCar;

        this.lastRouteInfo = template.routeInfo || null;
      } else {
        this.selectedStartBase = '';
        this.selectedEndBase = '';
        this.selectedTransportMode = ContainerTransportModeEnum.byCar;
        this.lastRouteInfo = null;
      }
    }
  }

  onStartBaseChange(
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
      this.containerService.updateStartBase(
        weekdayNumber,
        isHoliday,
        this.selectedStartBase,
      );
      this.workplaceStateService.areObjectsDirty();
    }
  }

  onEndBaseChange(
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
      this.containerService.updateEndBase(
        weekdayNumber,
        isHoliday,
        this.selectedEndBase,
      );
      this.workplaceStateService.areObjectsDirty();
    }
  }

  onTransportModeChange(
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    if (selectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(selectedWeekday);
      this.containerService.updateTransportMode(
        weekdayNumber,
        isHoliday,
        this.selectedTransportMode,
      );
      this.workplaceStateService.areObjectsDirty();
    }
  }

  selectTransportMode(
    mode: ContainerTransportModeEnum,
    selectedWeekday: string | null,
    isHoliday: boolean,
  ): void {
    this.selectedTransportMode = mode;
    this.onTransportModeChange(selectedWeekday, isHoliday);
  }

  private convertShiftToContainerTemplateItem(
    shift: IShift,
  ): IContainerTemplateItem {
    return {
      tmpId: newGuid(),
      shiftId: shift.id!,
      shift: shift,
      startItem: shift.startShift,
      endItem: shift.endShift,
      briefingTime: shift.briefingTime,
      debriefingTime: shift.debriefingTime,
      travelTimeAfter: shift.travelTimeAfter,
      travelTimeBefore: shift.travelTimeBefore,
      timeRangeStartItem: shift.isTimeRange ? shift.startShift : '',
      timeRangeEndItem: shift.isTimeRange ? shift.endShift : '',
    };
  }
}
