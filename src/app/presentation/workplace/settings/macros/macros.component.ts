// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, AfterViewInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { MacroHeaderComponent } from './macro-header/macro-header.component';
import { MacroRowComponent } from './macro-row/macro-row.component';
import { Macro } from 'src/app/domain/models/settings/macro-class';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

@Component({
  selector: 'app-macros',
  templateUrl: './macros.component.html',
  styleUrls: ['./macros.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    SettingsListCardComponent,
    MacroHeaderComponent,
    MacroRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacrosComponent implements AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.MACRO;
  @ViewChildren(MacroRowComponent) macroRows!: QueryList<MacroRowComponent>;
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  private macroManagementService = inject(MacroManagementService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;
  private destroy$ = new Subject<void>();

  message = DomainMessages.DELETE_ENTRY;
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
          this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      });

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.macroManagementService.loadMacros();
  }

  onClickAdd(): void {
    const macro = new Macro();
    macro.name = DomainMessages.NOT_DEFINED;
    macro.isDirty = CreateEntriesEnum.new;

    this.pendingOpenMacro = macro;
    this.dataManagementSettingsService.macros.macroList.set([
      ...this.dataManagementSettingsService.macros.macroList(),
      macro
    ]);
  }

  cancelNewMacro(index: number): void {
    const macros = this.dataManagementSettingsService.macros.macroList();
    if (index >= 0 && index < macros.length) {
      this.dataManagementSettingsService.macros.macroList.set([
        ...macros.slice(0, index),
        ...macros.slice(index + 1)
      ]);
    }
  }

  onMacroChanged(index: number): void {
    const macros = this.dataManagementSettingsService.macros.macroList();
    if (index >= 0 && index < macros.length) {
      this.dataManagementSettingsService.macros.macroList.set([...macros]);
    }
  }

  openDeleteMacro(index: number): void {
    const macros = this.dataManagementSettingsService.macros.macroList();

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
    const macros = this.dataManagementSettingsService.macros.macroList();

    if (index >= 0 && index < macros.length) {
      const macro = macros[index];

      if (macro) {
        if (macro.isDirty === CreateEntriesEnum.new) {
          this.dataManagementSettingsService.macros.macroList.set([
            ...macros.slice(0, index),
            ...macros.slice(index + 1)
          ]);
        } else {
          const updatedMacro = { ...macro };
          if (updatedMacro.name) {
            updatedMacro.name = updatedMacro.name + '--isDeleted';
          }
          updatedMacro.isDirty = CreateEntriesEnum.delete;

          this.dataManagementSettingsService.macros.macroList.set([
            ...macros.slice(0, index),
            updatedMacro,
            ...macros.slice(index + 1)
          ]);
          this.macroManagementService.save();
        }
      }
    }
  }

  /**
   * Removes invalid characters from names
   *
   * This method is currently not used but was kept
   * from the original code in case it is needed later.
   */
  private parseName(value: string): string {
    return value
      .replace(/ /g, '_')
      .replace(/\(/g, '_')
      .replace(/\)/g, '_')
      .replace(/=/g, '_')
      .replace(/>/g, '_')
      .replace(/</g, '_')
      .replace(/\//g, '_')
      .replace(/\\/g, '_');
  }
}
