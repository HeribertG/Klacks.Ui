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
import { Subject, TimeoutError, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
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
import {
  RouteOptimizationService,
  ITimeBlock,
  ITimeBlockResult,
  IAutofillResult,
} from 'src/app/domain/services/route-optimization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import {
  timeToString,
  timeToMinutes,
} from 'src/app/shared/helpers/time-format.helper';
import { convertShiftToContainerTemplateItem } from 'src/app/shared/helpers/container-template-format.helper';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

export interface AutofillRequest {
  containerShift: IShift | null;
  selectedWeekday: string | null;
  isHoliday: boolean;
  timeFrom: OwnTime;
  timeTo: OwnTime;
  additionalAvailableWorkIds: string[];
  timeRangeToleranceValue: number;
  destroy$: Subject<void>;
  onStateChanged?: () => void;
}

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
  private dataShiftService = inject(DataShiftService);

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

  autofill(request: AutofillRequest, localShiftPool: IShift[]): void {
    const {
      containerShift, selectedWeekday, isHoliday,
      timeFrom, timeTo, additionalAvailableWorkIds,
      timeRangeToleranceValue, destroy$, onStateChanged,
    } = request;

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

    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    const absenceItems = items.filter((item) => !!item.absenceId);
    const timeBlocks = this.convertAbsencesToTimeBlocks(absenceItems);

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
        timeBlocks,
        additionalAvailableWorkIds,
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
            onStateChanged?.();
            return;
          }

          const missingIds = result.selectedShiftIds.filter(
            id => !localShiftPool.some(s => s.id === id),
          );

          const guardedWeekday = selectedWeekday!;
          const proceed = (enrichedPool: IShift[]): void => {
            const newItems = this.convertAutofillResultToItems(
              result.selectedShiftIds,
              enrichedPool,
            );
            this.applyAutofillResult(
              result,
              newItems,
              timeFrom,
              guardedWeekday,
              isHoliday,
              onStateChanged,
            );
          };

          if (missingIds.length === 0) {
            proceed(localShiftPool);
            return;
          }

          this.dataShiftService
            .getShiftsByIds(missingIds)
            .pipe(
              takeUntil(destroy$),
              catchError(() => of([] as IShift[])),
            )
            .subscribe(fetchedShifts => {
              proceed([...localShiftPool, ...fetchedShifts]);
            });
        },
        error: (error) => {
          this.isAutofillRunning = false;
          const message = error instanceof TimeoutError
            ? this.translateService.instant('shift.container-template.toast.autofill-timeout')
            : error.error || error.message || error.statusText || 'Unknown error';
          this.toastService.showError(message, 'autofill-error');
          onStateChanged?.();
        },
      });
  }

  private applyAutofillResult(
    result: IAutofillResult,
    newItems: IContainerTemplateItem[],
    timeFrom: OwnTime,
    selectedWeekday: string,
    isHoliday: boolean,
    onStateChanged?: () => void,
  ): void {
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
    onStateChanged?.();
  }

  convertAutofillResultToItems(
    selectedShiftIds: string[],
    availableTasks: IShift[],
  ): IContainerTemplateItem[] {
    const items: IContainerTemplateItem[] = [];

    for (const shiftId of selectedShiftIds) {
      const shift = availableTasks.find((t) => t.id === shiftId);
      if (shift) {
        items.push(convertShiftToContainerTemplateItem(shift));
      }
    }

    return items;
  }

  optimizeRoute(
    selectedWeekday: string | null,
    isHoliday: boolean,
    timeFrom: OwnTime,
    destroy$: Subject<void>,
    onStateChanged?: () => void,
  ): void {
    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    const shiftItems = items.filter((item) => !!item.shiftId);

    if (shiftItems.length < 2) {
      this.toastService.showInfo(
        this.translateService.instant(
          'shift.container-template.toast.min-shifts-required',
        ),
      );
      return;
    }

    const shiftIds = shiftItems.map((item) => item.shiftId!);
    const absenceItems = items.filter((item) => !!item.absenceId);
    const timeBlocks = this.convertAbsencesToTimeBlocks(absenceItems);

    this.isOptimizing = true;
    this.toastService.showInfo(
      this.translateService.instant(
        'shift.container-template.toast.optimizing-route',
      ),
      '',
      '',
      TOAST_ICONS.ROUTE,
    );

    const containerFromTime = timeToString(
      parseInt(timeFrom.hours),
      parseInt(timeFrom.minutes),
    );

    this.routeOptimizationService
      .optimizeRoute(
        shiftIds,
        this.selectedStartBase || undefined,
        this.selectedEndBase || undefined,
        this.selectedTransportMode,
        timeBlocks,
        containerFromTime,
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
          onStateChanged?.();
        },
        error: (error) => {
          this.isOptimizing = false;
          const serverMessage =
            (typeof error?.error === 'string' ? error.error : error?.error?.message) ||
            error.message ||
            error.statusText ||
            'Unknown error';
          this.toastService.showError(
            serverMessage,
            'route-optimization-error',
          );
          onStateChanged?.();
        },
      });
  }

  applyOptimizedRoute(
    result: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

    const shiftItems = currentItems.filter((item) => !!item.shiftId);
    const absenceItems = currentItems.filter((item) => !!item.absenceId);

    const reorderedShiftItems = this.itemManipulationService.applyOptimizedRoute(
      {
        optimizedRoute: result.optimizedRoute,
        travelTimeFromStartBase: result.travelTimeFromStartBase,
        travelTimeToEndBase: result.travelTimeToEndBase,
        distanceToEndBaseKm: result.distanceToEndBaseKm,
      },
      shiftItems,
      containerStartTimeMinutes,
    );

    const reorderedItems = this.applyPlacedTimeBlocks(
      result.placedTimeBlocks,
      absenceItems,
      reorderedShiftItems,
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

  convertAbsencesToTimeBlocks(
    absenceItems: IContainerTemplateItem[],
  ): ITimeBlock[] {
    return absenceItems
      .filter((item) => !!item.absenceId)
      .map((item) => {
        const hasFixedTime = !!item.startItem && !!item.endItem;
        const minutesPerDay = 1440;
        let durationMinutes = hasFixedTime
          ? timeToMinutes(item.endItem!) - timeToMinutes(item.startItem!)
          : timeToMinutes(item.timeRangeEndItem || '00:30:00') -
            timeToMinutes(item.timeRangeStartItem || '00:00:00');
        if (durationMinutes < 0) {
          durationMinutes += minutesPerDay;
        }

        return {
          id: item.absenceId!,
          fixedStartTime: hasFixedTime ? item.startItem : undefined,
          fixedEndTime: hasFixedTime ? item.endItem : undefined,
          durationMinutes: Math.max(durationMinutes, 1),
          isMovable: !hasFixedTime,
        } as ITimeBlock;
      });
  }

  applyPlacedTimeBlocks(
    placedBlocks: ITimeBlockResult[] | undefined,
    absenceItems: IContainerTemplateItem[],
    reorderedShiftItems: IContainerTemplateItem[],
  ): IContainerTemplateItem[] {
    if (!placedBlocks || placedBlocks.length === 0) {
      return [...reorderedShiftItems, ...absenceItems];
    }

    const result: IContainerTemplateItem[] = [...reorderedShiftItems];

    for (const block of placedBlocks) {
      const absenceItem = absenceItems.find(
        (item) => item.absenceId === block.id,
      );
      if (absenceItem) {
        const updatedItem: IContainerTemplateItem = {
          ...absenceItem,
          startItem: block.startTime,
          endItem: block.endTime,
          timeRangeStartItem: block.startTime,
          timeRangeEndItem: block.endTime,
        };

        const insertIdx = Math.min(block.insertionPosition, result.length);
        result.splice(insertIdx, 0, updatedItem);
      }
    }

    return result;
  }

}
