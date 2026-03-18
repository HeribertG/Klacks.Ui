// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for managing the properties dialog of container template items.
 * @param editedProperties - Currently edited properties in the modal dialog
 * @param contextMenuTargetItem - The item targeted by the context menu right-click
 */
import { Injectable, inject, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { ContainerTemplateItemManipulationService } from './container-template-item-manipulation.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';

export interface EditedProperties {
  timeRangeStartShift: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeBefore: string;
  travelTimeAfter: string;
  transportMode: TransportModeEnum;
}

@Injectable()
export class ContainerTemplatePropertiesService {
  private ngbModal = inject(NgbModal);
  private timeRangeService = inject(TimeRangeService);
  private shiftService = inject(ContainerTemplateShiftService);
  private itemManipulationService = inject(ContainerTemplateItemManipulationService);
  private containerService = inject(DataManagementContainerService);
  private workplaceStateService = inject(WorkplaceStateService);

  public contextMenuTargetItem: IContainerTemplateItem | null = null;
  public editedProperties: EditedProperties | null = null;
  private currentSelectedWeekday: string | null = null;
  private currentIsHoliday = false;

  openPropertiesDialog(
    propertiesModal: TemplateRef<unknown>,
    selectedWeekday?: string | null,
    isHoliday?: boolean,
  ): void {
    if (!this.contextMenuTargetItem) return;

    this.currentSelectedWeekday = selectedWeekday ?? null;
    this.currentIsHoliday = isHoliday ?? false;

    this.editedProperties = {
      timeRangeStartShift: this.contextMenuTargetItem.timeRangeStartShift || '',
      briefingTime: this.contextMenuTargetItem.briefingTime || '00:00',
      debriefingTime: this.contextMenuTargetItem.debriefingTime || '00:00',
      travelTimeBefore: this.contextMenuTargetItem.travelTimeBefore || '00:00',
      travelTimeAfter: this.contextMenuTargetItem.travelTimeAfter || '00:00',
      transportMode:
        this.contextMenuTargetItem.transportMode ?? TransportModeEnum.byCar,
    };

    this.ngbModal.open(propertiesModal, { centered: true }).result.then(
      () => {
        this.applyPropertiesChanges();
      },
      () => {},
    );
  }

  applyPropertiesChanges(): void {
    if (!this.contextMenuTargetItem || !this.editedProperties) return;

    const items = this.shiftService.selectedContainerTemplateItemsSignal();
    const targetItemId =
      this.contextMenuTargetItem.id || this.contextMenuTargetItem.tmpId;

    const updatedItems = this.itemManipulationService.applyTimeChanges(
      this.contextMenuTargetItem,
      {
        briefingTime: this.editedProperties.briefingTime,
        debriefingTime: this.editedProperties.debriefingTime,
        travelTimeBefore: this.editedProperties.travelTimeBefore,
        travelTimeAfter: this.editedProperties.travelTimeAfter,
        timeRangeStartShift: this.editedProperties.timeRangeStartShift,
        transportMode: this.editedProperties.transportMode,
      },
      items,
    );

    this.shiftService.setSelectedContainerTemplateItems(updatedItems);

    this.shiftService.setSelectedShift(null);
    const updatedItem = updatedItems.find(
      (item) => (item.id || item.tmpId) === targetItemId,
    );
    if (updatedItem) {
      this.shiftService.setSelectedShift(updatedItem);
    }

    if (this.currentSelectedWeekday) {
      const weekdayNumber = this.containerService.getWeekdayNumber(this.currentSelectedWeekday);
      this.containerService.updateTaskOrderInTemplates(
        updatedItems,
        weekdayNumber,
        this.currentIsHoliday,
      );
    }

    this.workplaceStateService.areObjectsDirty();
  }

  getPropertiesTimeRangeStart(): OwnTime {
    if (!this.editedProperties?.timeRangeStartShift) {
      return OwnTime.forTime('00', '00');
    }
    const parsed = this.timeRangeService.parseTimeString(
      this.editedProperties.timeRangeStartShift,
    );
    if (!parsed) {
      return OwnTime.forTime('00', '00');
    }
    return OwnTime.forTime(
      parsed.hours.toString().padStart(2, '0'),
      parsed.minutes.toString().padStart(2, '0'),
    );
  }

  onPropertiesTimeRangeStartChange(time: OwnTime): void {
    if (this.editedProperties) {
      this.editedProperties.timeRangeStartShift = `${time.hours}:${time.minutes}:00`;
    }
  }

  getPropertiesBriefingTime(): OwnTime {
    return this.parseTimeToOwnTime(
      this.editedProperties?.briefingTime || '00:00',
    );
  }

  onPropertiesBriefingTimeChange(time: OwnTime): void {
    if (this.editedProperties) {
      this.editedProperties.briefingTime = `${time.hours}:${time.minutes}`;
    }
  }

  getPropertiesDebriefingTime(): OwnTime {
    return this.parseTimeToOwnTime(
      this.editedProperties?.debriefingTime || '00:00',
    );
  }

  onPropertiesDebriefingTimeChange(time: OwnTime): void {
    if (this.editedProperties) {
      this.editedProperties.debriefingTime = `${time.hours}:${time.minutes}`;
    }
  }

  getPropertiesTravelTimeBefore(): OwnTime {
    return this.parseTimeToOwnTime(
      this.editedProperties?.travelTimeBefore || '00:00',
    );
  }

  onPropertiesTravelTimeBeforeChange(time: OwnTime): void {
    if (this.editedProperties) {
      this.editedProperties.travelTimeBefore = `${time.hours}:${time.minutes}`;
    }
  }

  getPropertiesTravelTimeAfter(): OwnTime {
    return this.parseTimeToOwnTime(
      this.editedProperties?.travelTimeAfter || '00:00',
    );
  }

  onPropertiesTravelTimeAfterChange(time: OwnTime): void {
    if (this.editedProperties) {
      this.editedProperties.travelTimeAfter = `${time.hours}:${time.minutes}`;
    }
  }

  getPropertiesTransportMode(): TransportModeEnum {
    return this.editedProperties?.transportMode ?? TransportModeEnum.byCar;
  }

  selectPropertiesTransportMode(mode: TransportModeEnum): void {
    if (this.editedProperties) {
      this.editedProperties.transportMode = mode;
    }
  }

  private parseTimeToOwnTime(timeString: string): OwnTime {
    const parts = timeString.split(':');
    const hours = parts[0] || '00';
    const minutes = parts[1] || '00';
    return OwnTime.forDuration(
      hours.padStart(2, '0'),
      minutes.padStart(2, '0'),
    );
  }
}
