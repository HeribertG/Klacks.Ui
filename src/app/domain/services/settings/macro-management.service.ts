// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataMacroService } from 'src/app/infrastructure/api/settings/data-macro.service';
import { IMacro } from 'src/app/domain/models/settings/macro.interface';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { cloneObject, compareComplexObjects } from 'src/app/domain/helpers/object.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Injectable({
  providedIn: 'root',
})
export class MacroManagementService {
  private dataMacroService = inject(DataMacroService);
  private destroy$ = new Subject<void>();

  public macroList = signal<IMacro[]>([]);
  private macroListOriginal = signal<IMacro[]>([]);

  public isLoading = signal<boolean>(false);
  public isDirty = computed(() => this.checkIfDirty());

  private saveCounter = 0;
  private rejectedMacros: IMacro[] = [];

  loadMacros(): void {
    this.isLoading.set(true);

    this.dataMacroService
      .readMacroList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (macros) => {
          if (macros) {
            this.applyLoadedMacros(macros as IMacro[]);
          }
        },
        error: (error) => {
          console.error('Failed to load macros:', error);
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  async loadMacrosAsync(): Promise<void> {
    this.rejectedMacros = [];
    const macros = await firstValueFrom(this.dataMacroService.readMacroList());
    if (macros) {
      this.applyLoadedMacros(macros as IMacro[]);
    }
  }

  private applyLoadedMacros(macros: IMacro[]): void {
    const sortedMacros = this.sortMacros(macros);
    this.macroListOriginal.set(cloneObject(sortedMacros));
    this.macroList.set(this.withRejectedMacros(sortedMacros));
  }

  private sortMacros(macros: IMacro[]): IMacro[] {
    return [...macros].sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  save(): void {
    if (!this.isDirty()) {
      return;
    }

    this.rejectedMacros = [];
    const macros = this.sortMacros(this.macroList());

    macros.forEach((macro) => {
      if (macro.isDirty === CreateEntriesEnum.delete) {
        this.deleteMacro(macro);
      } else if (macro.isDirty === CreateEntriesEnum.new && macro.name && macro.name !== DomainMessages.NOT_DEFINED) {
        this.addMacro(macro);
      } else if (macro.isDirty === CreateEntriesEnum.rewrite) {
        if (macro.name === '') {
          this.deleteMacro(macro);
        } else {
          this.updateMacro(macro);
        }
      }
    });
  }

  private addMacro(macro: IMacro): void {
    const macroToAdd = { ...macro };
    delete macroToAdd.id;

    this.saveCounter++;
    this.dataMacroService
      .addMacro(macroToAdd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveCounter--;
          this.checkSaveComplete();
        },
        error: (error) => {
          console.error('Failed to add macro:', error);
          this.rejectedMacros.push(macro);
          this.saveCounter--;
          this.checkSaveComplete();
        },
      });
  }

  private updateMacro(macro: IMacro): void {
    this.saveCounter++;
    this.dataMacroService
      .updateMacro(macro)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveCounter--;
          this.checkSaveComplete();
        },
        error: (error) => {
          console.error('Failed to update macro:', error);
          this.rejectedMacros.push(macro);
          this.saveCounter--;
          this.checkSaveComplete();
        },
      });
  }

  private deleteMacro(macro: IMacro): void {
    if (!macro.id) {
      return;
    }

    this.saveCounter++;
    this.dataMacroService
      .deleteMacro(macro.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saveCounter--;
          this.checkSaveComplete();
        },
        error: (error) => {
          console.error('Failed to delete macro:', error);
          this.saveCounter--;
          this.checkSaveComplete();
        },
      });
  }

  private checkSaveComplete(): void {
    if (this.saveCounter === 0) {
      this.loadMacros();
    }
  }

  private withRejectedMacros(loaded: IMacro[]): IMacro[] {
    if (this.rejectedMacros.length === 0) {
      return loaded;
    }

    const rejectedUpdates = new Map(
      this.rejectedMacros.filter((macro) => macro.id).map((macro) => [macro.id, macro])
    );
    const rejectedCreates = this.rejectedMacros.filter((macro) => !macro.id);
    return [...loaded.map((macro) => rejectedUpdates.get(macro.id) ?? macro), ...rejectedCreates];
  }

  discardUnsavedMacro(macro: IMacro): void {
    this.rejectedMacros = this.rejectedMacros.filter((rejected) => rejected !== macro);

    const current = this.macroList();
    if (!current.includes(macro)) {
      return;
    }

    const stored = macro.id ? this.macroListOriginal().find((original) => original.id === macro.id) : undefined;
    const restored = stored ? [cloneObject(stored)] : [];
    this.macroList.set(current.flatMap((entry) => (entry === macro ? restored : [entry])));
  }

  private checkIfDirty(): boolean {
    const listOfExcludedProperties = ['isDirty'];

    const current = this.macroList();
    const original = this.macroListOriginal();

    if (!compareComplexObjects(current, original, listOfExcludedProperties)) {
      const incompleteEntries = current.filter(
        (x) =>
          x.isDirty === CreateEntriesEnum.new &&
          x.name === DomainMessages.NOT_DEFINED
      );

      if (incompleteEntries.length > 0) {
        return false;
      }

      return true;
    }

    return false;
  }

  resetData(): void {
    this.rejectedMacros = [];
    this.loadMacros();
  }

  async resetDataAsync(): Promise<void> {
    await this.loadMacrosAsync();
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
