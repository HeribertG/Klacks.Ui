import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from 'src/app/icons/icons.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

import { StateHeaderComponent } from './state-header/state-header.component';
import { StateRowComponent } from './state-row/state-row.component';

import { State } from 'src/app/core/client-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { DataManagementSettingsService } from 'src/app/data/management/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

@Component({
  selector: 'app-state',
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    IconsModule,
    SharedModule,
    SpinnerModule,
    StateHeaderComponent,
    StateRowComponent,
  ],
})
export class StateComponent {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd(): void {
    const state = new State();
    state.name = new MultiLanguage();
    state.isDirty = CreateEntriesEnum.new;

    this.dataManagementSettingsService.statesList.push(state);
    this.onIsChanging(true);
  }

  onClickDelete(index: number): void {
    const states = this.dataManagementSettingsService.statesList;

    if (index >= 0 && index < states.length) {
      const state = states[index];

      if (state) {
        // Wenn es ein neuer Eintrag ist, komplett entfernen
        if (state.isDirty === CreateEntriesEnum.new) {
          states.splice(index, 1);
        } else {
          // Sonst als gelöscht markieren
          if (state.name?.de) {
            state.name.de = state.name.de + '--isDeleted';
          }
          state.isDirty = CreateEntriesEnum.delete;
        }
      }

      this.onIsChanging(true);
    }
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }
}
