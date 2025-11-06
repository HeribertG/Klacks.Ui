import { Injectable, inject, signal, effect } from '@angular/core';
import { Subject, forkJoin, debounceTime } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { DataCountryStateService } from 'src/app/infrastructure/api/data-country-state.service';
import { ICountry, IState } from 'src/app/domain/models/client-class';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';

@Injectable({
  providedIn: 'root',
})
export class CountryStateManagementService {
  private dataCountryStateService = inject(DataCountryStateService);
  private destroy$ = new Subject<void>();

  public countriesList = signal<ICountry[]>([]);
  public statesList = signal<IState[]>([]);
  public isLoading = signal<boolean>(false);

  private countriesListDummy: ICountry[] = [];
  private statesListDummy: IState[] = [];

  private pendingCountryOperations = 0;
  private pendingStateOperations = 0;

  private autoSaveSubject = new Subject<void>();

  constructor() {
    effect(() => {
      this.countriesList();
      this.statesList();
      this.autoSaveSubject.next();
    });

    this.autoSaveSubject
      .pipe(
        debounceTime(1500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.autoSave();
      });
  }

  private autoSave(): void {
    if (this.isCountriesDirty()) {
      this.saveCountries();
    }
    if (this.isStatesDirty()) {
      this.saveStates();
    }
  }

  loadCountriesAndStates(): void {
    this.isLoading.set(true);

    forkJoin({
      countries: this.dataCountryStateService.getCountryList(),
      states: this.dataCountryStateService.GetStateList()
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: ({ countries, states }) => {
          if (countries) {
            this.countriesList.set(countries as ICountry[]);
            this.countriesListDummy = cloneObject<ICountry[]>(this.countriesList());
          }
          if (states) {
            this.statesList.set(states as IState[]);
            this.statesListDummy = cloneObject<IState[]>(this.statesList());
          }
        },
        error: (error) => {
          console.error('Failed to load countries and states:', error);
        }
      });
  }

  saveCountries(): void {
    const countriesToSave = this.countriesList();

    countriesToSave.forEach((country) => {
      if (!country.isDirty) {
        return;
      }

      const isEmpty = this.isMultiLanguageEmpty(country.name!);

      if (isEmpty && country.isDirty === CreateEntriesEnum.rewrite) {
        this.deleteCountry(country.id!);
      } else if (country.isDirty === CreateEntriesEnum.delete) {
        this.deleteCountry(country.id!);
      } else if (!isEmpty && country.isDirty === CreateEntriesEnum.new) {
        this.addCountry(country);
      } else if (!isEmpty && country.isDirty === CreateEntriesEnum.rewrite) {
        this.updateCountry(country);
      }
    });
  }

  saveStates(): void {
    const statesToSave = this.statesList();

    statesToSave.forEach((state) => {
      if (!state.isDirty) {
        return;
      }

      const isEmpty = this.isMultiLanguageEmpty(state.name!);

      if (isEmpty && state.isDirty === CreateEntriesEnum.rewrite) {
        this.deleteState(state.id!);
      } else if (state.isDirty === CreateEntriesEnum.delete) {
        this.deleteState(state.id!);
      } else if (!isEmpty && state.isDirty === CreateEntriesEnum.new) {
        this.addState(state);
      } else if (!isEmpty && state.isDirty === CreateEntriesEnum.rewrite) {
        this.updateState(state);
      }
    });
  }

  private addCountry(country: ICountry): void {
    this.pendingCountryOperations++;
    const countryToAdd = { ...country };
    delete countryToAdd.id;

    this.dataCountryStateService.addCountry(countryToAdd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to add country:', error);
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        }
      });
  }

  private updateCountry(country: ICountry): void {
    this.pendingCountryOperations++;

    this.dataCountryStateService.updateCountry(country)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to update country:', error);
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        }
      });
  }

  private deleteCountry(id: string): void {
    this.pendingCountryOperations++;

    this.dataCountryStateService.deleteCountry(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to delete country:', error);
          this.pendingCountryOperations--;
          this.checkCountryOperationsComplete();
        }
      });
  }

  private addState(state: IState): void {
    this.pendingStateOperations++;
    const stateToAdd = { ...state };
    delete stateToAdd.id;

    this.dataCountryStateService.addState(stateToAdd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to add state:', error);
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        }
      });
  }

  private updateState(state: IState): void {
    this.pendingStateOperations++;

    this.dataCountryStateService.updateState(state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to update state:', error);
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        }
      });
  }

  private deleteState(id: string): void {
    this.pendingStateOperations++;

    this.dataCountryStateService.deleteState(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to delete state:', error);
          this.pendingStateOperations--;
          this.checkStateOperationsComplete();
        }
      });
  }

  private checkCountryOperationsComplete(): void {
    if (this.pendingCountryOperations === 0) {
      this.reloadCountries();
    }
  }

  private checkStateOperationsComplete(): void {
    if (this.pendingStateOperations === 0) {
      this.reloadStates();
    }
  }

  private reloadCountries(): void {
    this.dataCountryStateService.getCountryList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        if (countries) {
          this.countriesList.set(countries as ICountry[]);
          this.countriesListDummy = cloneObject<ICountry[]>(this.countriesList());
        }
      });
  }

  private reloadStates(): void {
    this.dataCountryStateService.GetStateList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((states) => {
        if (states) {
          this.statesList.set(states as IState[]);
          this.statesListDummy = cloneObject<IState[]>(this.statesList());
        }
      });
  }

  isCountriesDirty(): boolean {
    const listOfExcludedProperties = ['isDirty'];
    const currentList = this.countriesList();

    if (!compareComplexObjects(currentList, this.countriesListDummy, listOfExcludedProperties)) {
      const incompleteEntries = currentList.filter(
        (country) =>
          country.isDirty === CreateEntriesEnum.new &&
          (this.isMultiLanguageEmpty(country.name!) ||
            country.abbreviation === '' ||
            country.prefix === '')
      );

      return incompleteEntries.length === 0;
    }
    return false;
  }

  isStatesDirty(): boolean {
    const listOfExcludedProperties = ['isDirty'];
    const currentList = this.statesList();

    if (!compareComplexObjects(currentList, this.statesListDummy, listOfExcludedProperties)) {
      const incompleteEntries = currentList.filter(
        (state) =>
          state.isDirty === CreateEntriesEnum.new &&
          (this.isMultiLanguageEmpty(state.name!) ||
            state.abbreviation === '' ||
            state.countryPrefix === '')
      );

      return incompleteEntries.length === 0;
    }
    return false;
  }

  isDirty(): boolean {
    return this.isCountriesDirty() || this.isStatesDirty();
  }

  private isMultiLanguageEmpty(value: MultiLanguage): boolean {
    const isNotUndefined = value.de && value.en && value.fr && value.it;
    if (isNotUndefined === undefined) {
      return true;
    }

    const isNotEmpty = value.de! + value.en! + value.fr! + value.it!;
    return isNotEmpty === '';
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
