import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { MacroHeaderComponent } from './macro-header/macro-header.component';
import { MacroRowComponent } from './macro-row/macro-row.component';

import { Macro } from 'src/app/domain/models/macro-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

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
    SpinnerModule,
    MacroHeaderComponent,
    MacroRowComponent,
  ],
})
export class MacrosComponent {
  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd(): void {
    const macro = new Macro();
    macro.name = MessageLibrary.NOT_DEFINED;
    macro.isDirty = CreateEntriesEnum.new;

    this.dataManagementSettingsService.macroList.push(macro);
  }

  onClickDelete(index: number): void {
    const macros = this.dataManagementSettingsService.macroList;

    if (index >= 0 && index < macros.length) {
      const macro = macros[index];

      if (macro) {
        if (macro.isDirty === CreateEntriesEnum.new) {
          macros.splice(index, 1);
        } else {
          if (macro.name) {
            macro.name = macro.name + '--isDeleted';
          }
          macro.isDirty = CreateEntriesEnum.delete;
        }
      }
    }
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
