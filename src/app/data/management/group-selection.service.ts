import { Injectable, signal } from '@angular/core';
import { Group } from 'src/app/core/group-class';

@Injectable({
  providedIn: 'root',
})
export class GroupSelectionService {
  // Signal für den aktuell ausgewählten Knoten
  private _selectedGroup = signal<Group | null>(null);

  // Getter für den ausgewählten Knoten
  public get selectedGroup(): Group | null {
    return this._selectedGroup();
  }

  // Setter für den ausgewählten Knoten
  public set selectedGroup(group: Group | null) {
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
    this._selectedGroup.set(null);
    this.triggerSelectedGroupChanged();
  }

  // Hilfsmethode zum Auslösen des selectedGroupChanged-Signals
  private triggerSelectedGroupChanged(): void {
    this.selectedGroupChanged.set(true);
    setTimeout(() => this.selectedGroupChanged.set(false), 100);
  }
}
