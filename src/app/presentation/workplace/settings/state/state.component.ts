import { Component, ElementRef, ViewChild, inject, AfterViewInit, OnDestroy } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { StateHeaderComponent } from './state-header/state-header.component';
import { StateRowComponent } from './state-row/state-row.component';

import { State } from 'src/app/domain/models/client/client-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Component({
  selector: 'app-state',
  templateUrl: './state.component.html',
  styleUrls: ['./state.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    NgbModule,
    SpinnerModule,
    StateHeaderComponent,
    StateRowComponent
],
})
export class StateComponent implements AfterViewInit, OnDestroy {
  @ViewChild('containerBox') containerBox?: ElementRef;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  message = DomainMessages.DELETE_ENTRY;

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'state'
        ) {
          this.deleteState(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  openDeleteState(index: number): void {
    const currentList = this.dataManagementSettingsService.statesList;
    if (index >= 0 && index < currentList.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'state';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private deleteState(indexStr: string): void {
    const index = parseInt(indexStr, 10);
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
