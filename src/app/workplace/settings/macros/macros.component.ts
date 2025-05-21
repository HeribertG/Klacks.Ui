import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

// Import der Unterkomponenten
import { MacroHeaderComponent } from './macro-header/macro-header.component';
import { MacroRowComponent } from './macro-row/macro-row.component';

import { Macro } from 'src/app/core/macro-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-macros',
  templateUrl: './macros.component.html',
  styleUrls: ['./macros.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    SharedModule,
    SpinnerModule,
    CodemirrorModule,
    MacroHeaderComponent,
    MacroRowComponent,
  ],
})
export class MacrosComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd(): void {
    const macro = new Macro();
    macro.name = MessageLibrary.NOT_DEFINED;
    macro.isDirty = CreateEntriesEnum.new;

    this.dataManagementSettingsService.macroList.push(macro);
    this.onIsChanging(true);
  }

  onClickDelete(index: number): void {
    const macros = this.dataManagementSettingsService.macroList;

    if (index >= 0 && index < macros.length) {
      const macro = macros[index];

      if (macro) {
        // Wenn es ein neuer Eintrag ist, komplett entfernen
        if (macro.isDirty === CreateEntriesEnum.new) {
          macros.splice(index, 1);
        } else {
          // Sonst als gelöscht markieren
          if (macro.name) {
            macro.name = macro.name + '--isDeleted';
          }
          macro.isDirty = CreateEntriesEnum.delete;
        }
      }

      this.onIsChanging(true);
    }
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }

  /**
   * Entfernt ungültige Zeichen aus Namen
   *
   * Diese Methode wird aktuell nicht verwendet, wurde aber
   * aus dem Originalcode beibehalten, falls sie später benötigt wird.
   */
  private parseName(value: string): string {
    return value
      .replace(' ', '_')
      .replace('(', '_')
      .replace(')', '_')
      .replace('=', '_')
      .replace('>', '_')
      .replace('<', '_')
      .replace('/', '_')
      .replace('\\', '_');
  }
}
