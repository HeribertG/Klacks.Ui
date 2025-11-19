import { Component, ElementRef, ViewChild, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';

import { StateHeaderComponent } from './state-header/state-header.component';
import { StateRowComponent } from './state-row/state-row.component';

import { State } from 'src/app/domain/models/client-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

@Component({
  selector: 'app-state',
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    StateHeaderComponent,
    StateRowComponent
],
})
export class StateComponent {
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);

  onClickAdd(): void {
    const state = new State();
    state.name = new MultiLanguage();
    state.isDirty = CreateEntriesEnum.new;

    const currentList = this.dataManagementSettingsService.statesList;
    this.dataManagementSettingsService.countryStateService.statesList.set([...currentList, state]);

    requestAnimationFrame(() => {
      setTimeout(() => {
        if (this.containerBox?.nativeElement) {
          this.containerBox.nativeElement.scrollTop = this.containerBox.nativeElement.scrollHeight;
        }
      }, 100);
    });
  }

  onClickDelete(index: number): void {
    const currentList = this.dataManagementSettingsService.statesList;

    if (index >= 0 && index < currentList.length) {
      const state = currentList[index];

      if (state) {
        if (state.isDirty === CreateEntriesEnum.new) {
          const updatedList = [...currentList];
          updatedList.splice(index, 1);
          this.dataManagementSettingsService.countryStateService.statesList.set(updatedList);
        } else {
          if (state.name?.de) {
            state.name.de = state.name.de + '--isDeleted';
          }
          state.isDirty = CreateEntriesEnum.delete;
          this.dataManagementSettingsService.countryStateService.statesList.set([...currentList]);
        }
      }
    }
  }

  onIsChanging(): void {
    const currentList = this.dataManagementSettingsService.statesList;
    this.dataManagementSettingsService.countryStateService.statesList.set([...currentList]);
  }
}
