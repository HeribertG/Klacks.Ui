import { inject, Injectable, signal } from '@angular/core';
import { Group } from 'src/app/models/group-class';
import { EntityName } from './entity-names.enum';
import { WorkplaceStateService } from '../../workplace/core/workplace-state.service';
import { DataManagementBreakService } from './data-management-break.service';
import { DataManagementScheduleService } from './data-management-schedule.service';

@Injectable({
  providedIn: 'root',
})
export class GroupSelectionService {
  private dataManagementSwitchboard = inject(WorkplaceStateService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private dataManagementScheduleService = inject(DataManagementScheduleService);

  // Signal für den aktuell ausgewählten Knoten
  private _selectedGroup = signal<Group | undefined>(undefined);

  // Getter für den ausgewählten Knoten
  public get selectedGroup(): Group | undefined {
    return this._selectedGroup();
  }

  // Setter für den ausgewählten Knoten
  public set selectedGroup(group: Group | undefined) {
    this._selectedGroup.set(group);
  }

  // Signal, das ausgelöst wird, wenn sich der ausgewählte Knoten ändert
  public selectedGroupChanged = signal(false);

  // Methode zum Setzen des ausgewählten Knotens
  public selectGroup(group: Group): void {
    this._selectedGroup.set(group);
    this.triggerSelectedGroupChanged();
  }

  // Methode zum Zurücksetzen des ausgewählten Knotens
  public clearSelection(): void {
    this._selectedGroup.set(undefined);
    this.triggerSelectedGroupChanged();
  }

  private triggerSelectedGroupChanged(): void {
    this.selectedGroupChanged.set(true);
    setTimeout(() => this.selectedGroupChanged.set(false), 100);

    switch (this.dataManagementSwitchboard.nameOfVisibleEntity() as EntityName) {
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
    }
  }

  public get selectedGroupId(): string | undefined {
    return this._selectedGroup()?.id;
  }
}
