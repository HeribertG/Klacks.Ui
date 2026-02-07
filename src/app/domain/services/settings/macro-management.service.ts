import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataMacroService } from 'src/app/infrastructure/api/settings/data-macro.service';
import { IMacro } from 'src/app/domain/models/settings/macro-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
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

  loadMacros(): void {
    this.isLoading.set(true);

    this.dataMacroService
      .readMacroList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (macros) => {
          if (macros) {
            const sortedMacros = this.sortMacros(macros as IMacro[]);
            this.macroList.set(sortedMacros);
            this.macroListOriginal.set(cloneObject(sortedMacros));
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
    const macros = await firstValueFrom(this.dataMacroService.readMacroList());
    if (macros) {
      const sortedMacros = this.sortMacros(macros as IMacro[]);
      this.macroList.set(sortedMacros);
      this.macroListOriginal.set(cloneObject(sortedMacros));
    }
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
