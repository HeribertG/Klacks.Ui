import { Component, inject, AfterViewInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { Subject, takeUntil } from 'rxjs';

import { MacroHeaderComponent } from './macro-header/macro-header.component';
import { MacroRowComponent } from './macro-row/macro-row.component';

import { Macro } from 'src/app/domain/models/macro-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

@Component({
  selector: 'app-macros',
  templateUrl: './macros.component.html',
  styleUrls: ['./macros.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    NgbModule,
    SpinnerModule,
    MacroHeaderComponent,
    MacroRowComponent
],
})
export class MacrosComponent implements AfterViewInit, OnDestroy {
  @ViewChildren(MacroRowComponent) macroRows!: QueryList<MacroRowComponent>;

  public translate = inject(TranslateService);
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  message = MessageLibrary.DELETE_ENTRY;
  private macroToDeleteIndex: number | null = null;
  private pendingOpenMacro: Macro | null = null;

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'macros'
        ) {
          this.deleteMacro(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });

    this.macroRows.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.pendingOpenMacro !== null) {
          const row = this.macroRows.find(r => r.data === this.pendingOpenMacro);
          if (row) {
            setTimeout(() => row.openModal(), 0);
          }
          this.pendingOpenMacro = null;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    const macro = new Macro();
    macro.name = MessageLibrary.NOT_DEFINED;
    macro.isDirty = CreateEntriesEnum.new;

    this.pendingOpenMacro = macro;
    this.dataManagementSettingsService.macroList = [
      ...this.dataManagementSettingsService.macroList,
      macro
    ];
  }

  cancelNewMacro(index: number): void {
    const macros = this.dataManagementSettingsService.macroList;
    if (index >= 0 && index < macros.length) {
      this.dataManagementSettingsService.macroList = [
        ...macros.slice(0, index),
        ...macros.slice(index + 1)
      ];
    }
  }

  onMacroChanged(index: number): void {
    const macros = this.dataManagementSettingsService.macroList;
    if (index >= 0 && index < macros.length) {
      this.dataManagementSettingsService.macroList = [...macros];
    }
  }

  openDeleteMacro(index: number): void {
    const macros = this.dataManagementSettingsService.macroList;

    if (index >= 0 && index < macros.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'macros';

      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private deleteMacro(indexStr: string): void {
    const index = parseInt(indexStr, 10);
    const macros = this.dataManagementSettingsService.macroList;

    if (index >= 0 && index < macros.length) {
      const macro = macros[index];

      if (macro) {
        if (macro.isDirty === CreateEntriesEnum.new) {
          this.dataManagementSettingsService.macroList = [
            ...macros.slice(0, index),
            ...macros.slice(index + 1)
          ];
        } else {
          const updatedMacro = { ...macro };
          if (updatedMacro.name) {
            updatedMacro.name = updatedMacro.name + '--isDeleted';
          }
          updatedMacro.isDirty = CreateEntriesEnum.delete;

          this.dataManagementSettingsService.macroList = [
            ...macros.slice(0, index),
            updatedMacro,
            ...macros.slice(index + 1)
          ];
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
