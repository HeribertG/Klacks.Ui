import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbPaginationModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { IconTreeComponent } from 'src/app/icons/icon-tree.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';

@Component({
  selector: 'app-all-shift-list',
  templateUrl: './all-shift-list.component.html',
  styleUrl: './all-shift-list.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    TranslateModule,
    PencilIconGreyComponent,
    TrashIconRedComponent,
  ],
})
export class AllShiftListComponent {
  public translate = inject(TranslateService);
  public dataManagementShiftService = inject(DataManagementShiftService);

  highlightRowId?: string;

  resizeWindow: (() => void) | undefined;

  onResize(event: DOMRectReadOnly | any): void {}

  onAddShift(): void {}

  onLostFocus(): void {}

  onChangeWeekdayCheckBox(data: any, property: string, event: any): void {
    // Verhindert, dass das Event bis zum Eltern-Element (Zeile) propagiert
    event.stopPropagation();

    // Aktualisiert die Eigenschaft im Datenobjekt
    data[property] = event.target.checked;

    // Optional: Hier kann eine Methode aufgerufen werden,
    // um die Änderungen zu speichern oder zu verarbeiten
    this.saveChanges(data);
  }

  /**
   * Beispielmethode zum Speichern der Änderungen
   * @param data Das geänderte Datenelement
   */
  saveChanges(data: any): void {
    // Implementieren Sie hier Ihre Logik zum Speichern der Änderungen
    console.log('Änderungen gespeichert:', data);
  }

  // Bestehende Methode anpassen, um den richtigen Row-Klick zu behandeln
  onClickedRow(data: any): void {
    this.highlightRowId = data.id;
    // Weitere bestehende Logik beibehalten
  }

  onClickEdit(data: any): void {
    // Weitere bestehende Logik beibehalten
  }

  open(data: any): void {
    // Weitere bestehende Logik beibehalten
  }

  initializeData(): void {
    // Da wir jetzt den MockDataManagementShiftService verwenden,
    // ist keine zusätzliche Initialisierung notwendig, da die Daten
    // bereits vollständig im Mock vorhanden sind.
    // Falls Sie dennoch Anpassungen an den Daten vornehmen möchten,
    // können Sie das hier tun
  }
}
