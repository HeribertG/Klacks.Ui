// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { Group } from 'src/app/domain/models/group/group-class';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { ENTITY_STATE_PROVIDER_TOKEN } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { DataManagementBreakPlaceholderService } from '../break/data-management-break-placeholder.service';
import { DataManagementScheduleService } from '../schedule/data-management-schedule.service';
import { DataManagementShiftService } from '../shift/data-management-shift.service';
import { DataManagementClientService } from '../client/data-management-client.service';

@Injectable({
  providedIn: 'root',
})
export class GroupSelectionService {
  private dataManagementSwitchboard = inject(ENTITY_STATE_PROVIDER_TOKEN);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementScheduleService = inject(DataManagementScheduleService);
  private dataManagementShiftService = inject(DataManagementShiftService);
  private dataManagementClientService = inject(DataManagementClientService);

  private _selectedGroup = signal<Group | undefined>(undefined);
  private clientAvailabilityGroupCallback: ((groupId: string | undefined) => void) | null = null;

  public get selectedGroup(): Group | undefined {
    return this._selectedGroup();
  }

  public set selectedGroup(group: Group | undefined) {
    this._selectedGroup.set(group);
  }

  public selectedGroupChanged = signal(false);

  public selectGroup(group: Group): void {
    this._selectedGroup.set(group);
    this.triggerSelectedGroupChanged();
  }

  public clearSelection(): void {
    this._selectedGroup.set(undefined);
    this.triggerSelectedGroupChanged();
  }

  private triggerSelectedGroupChanged(): void {
    this.selectedGroupChanged.set(true);
    setTimeout(() => this.selectedGroupChanged.set(false), 100);

    switch (this.dataManagementSwitchboard.nameOfVisibleEntity() as EntityName) {
      case EntityName.CLIENT:
        this.dataManagementClientService.currentFilter.selectedGroup =
          this.selectedGroupId;
        this.dataManagementClientService.readPage();
        break;
      case EntityName.ABSENCE:
        this.dataManagementBreak.breakFilter.selectedGroup =
          this.selectedGroupId;
        this.dataManagementBreak.readYear();
        break;
      case EntityName.SCHEDULE:
        this.dataManagementScheduleService.workFilter.selectedGroup =
          this.selectedGroupId;
        this.dataManagementScheduleService.readDatas();
        break;
      case EntityName.SHIFT:
        this.dataManagementShiftService.currentFilter.selectedGroup =
          this.selectedGroupId;
        this.dataManagementShiftService.readPage();
        break;
      case EntityName.CLIENT_AVAILABILITY:
        this.clientAvailabilityGroupCallback?.(this.selectedGroupId);
        break;
    }
  }

  public get selectedGroupId(): string | undefined {
    return this._selectedGroup()?.id;
  }

  public registerClientAvailabilityCallback(cb: (groupId: string | undefined) => void): void {
    this.clientAvailabilityGroupCallback = cb;
  }

  public unregisterClientAvailabilityCallback(): void {
    this.clientAvailabilityGroupCallback = null;
  }
}
