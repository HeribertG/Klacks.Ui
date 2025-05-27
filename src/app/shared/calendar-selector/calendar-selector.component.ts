import {
  AfterViewInit,
  Component,
  EffectRef,
  EventEmitter,
  Injector,
  OnDestroy,
  OnInit,
  Output,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import {
  CalendarSelection,
  ICalendarSelection,
  SelectedCalendar,
} from 'src/app/core/calendar-selection-class';
import { DataManagementCalendarRulesService } from 'src/app/data/management/data-management-calendar-rules.service';
import { DataManagementCalendarSelectionService } from 'src/app/data/management/data-management-calendar-selection.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarDropdownComponent } from '../calendar-dropdown/calendar-dropdown.component';
import { ChipsComponent } from '../chips/chips.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

interface TranslationResults {
  headerCalendarDropdown: string;
  deleteMessage: string;
  message: string;
  emptyPlaceholder: string;
  inputTitle: string;
}

@Component({
  selector: 'app-calendar-selector',
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    CalendarDropdownComponent,
    ChipsComponent,
    FontAwesomeModule,
  ],
})
export class CalendarSelectorComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() openMenu = new EventEmitter();
  @Output() changeEvent = new EventEmitter();

  public dataManagementCalendarSelectionService = inject(
    DataManagementCalendarSelectionService
  );
  private translateService = inject(TranslateService);
  private dataManagementCalendarRulesService = inject(
    DataManagementCalendarRulesService
  );
  private localStorageService = inject(LocalStorageService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);

  public faPlus = faPlus;
  public faTrash = faTrash;

  public addButtonEnabled = false;
  public delButtonEnabled = false;
  public deleteMessage = '';
  public message = '';
  public modalTypeInput: ModalType = ModalType.Input;
  public modalTypeMessage: ModalType = ModalType.Message;
  public modalTypeDelete: ModalType = ModalType.Delete;

  public headerCalendarDropdown = '';

  private static readonly WAIT_TIME = 100;
  private static readonly CHIP_DISPLAY_SEPARATOR = '-';
  private static readonly CHIP_KEY_SEPARATOR = '|';

  private isFirstReadLocal = false;
  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;
  private effects: ReturnType<typeof effect>[] = [];

  ngOnInit(): void {
    this.dataManagementCalendarRulesService.init();
    this.readSignals();
    this.loadTranslations();
  }

  ngAfterViewInit(): void {
    this.dataManagementCalendarSelectionService.readData();

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((modalType: ModalType) => {
        switch (modalType) {
          case ModalType.Input: {
            this.newCalendarSelection();
            break;
          }
          case ModalType.Delete: {
            this.deleteCalendarSelection();
            break;
          }
          case ModalType.Message: {
            this.dataManagementCalendarSelectionService.updateCalendarSelection();
            break;
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectInstance) => effectInstance.destroy());

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  onChangeSelection(): void {
    this.setIdToLocalStorage();
    if (
      !this.dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder() &&
      this.dataManagementCalendarSelectionService.currentCalendarSelection?.id
    ) {
      this.dataManagementCalendarSelectionService.getCalendarSelection(
        this.dataManagementCalendarSelectionService.currentCalendarSelection.id
      );
    } else {
      this.resetCalendarRule();
      this.reReadChips();
      setTimeout(
        () => this.setCalendarRule(),
        CalendarSelectorComponent.WAIT_TIME
      );
    }
  }

  onChangeFilter(checkIfDirty = false): void {
    this.synchronizeSelectedCalendars();
    this.dataManagementCalendarSelectionService.readSChips(checkIfDirty);

    if (this.dataManagementCalendarSelectionService.isFilterDirty()) {
      this.dataManagementCalendarSelectionService.isChanged.set(true);
    }

    this.changeEvent.emit();
  }

  compareCalendars(c1: ICalendarSelection, c2: ICalendarSelection): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  onOpen(kind: ModalType) {
    switch (kind) {
      case ModalType.Input: {
        this.modalService.contentInputString = '';
        break;
      }
    }
    this.modalService.setDefault(kind);
    this.modalService.openModel(kind);
  }

  onIsClosing(): void {
    if (
      !this.dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder() &&
      this.dataManagementCalendarSelectionService.isFilterDirty()
    ) {
      this.modalService.setDefault(ModalType.Message);
      this.modalService.openModel(ModalType.Message);
    } else {
      this.onChangeFilter(true);
      this.openMenu.emit();
    }
  }

  onIsOpening() {
    setTimeout(
      () => this.setCalendarRule(),
      CalendarSelectorComponent.WAIT_TIME
    );
  }

  onDeleteChip(key: string): void {
    const tmp = this.findToken(key);
    const index = this.findIndexToken(key);

    if (!tmp || index === undefined || index < 0) {
      this.dataManagementCalendarSelectionService.readSChips(true);
      return;
    }

    tmp.select = false;
    this.spliceToken(index);
    this.changeEvent.emit();
    this.dataManagementCalendarSelectionService.readSChips(true);
  }

  get shouldEnableAddButton(): boolean {
    return (
      (this.dataManagementCalendarSelectionService.currentCalendarSelection
        ?.selectedCalendars?.length ?? 0) > 0
    );
  }

  get hasValidCalendarSelections(): boolean {
    const selections =
      this.dataManagementCalendarSelectionService.calendarsSelections;
    return !!(
      selections?.length &&
      this.dataManagementCalendarSelectionService.currentCalendarSelection
    );
  }

  get hasChips(): boolean {
    return !!this.dataManagementCalendarSelectionService.chips?.length;
  }

  get shouldShowDeleteButton(): boolean {
    return !this.dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder();
  }

  get chipList(): StateCountryToken[] {
    return this.dataManagementCalendarSelectionService.chips;
  }

  private get calendarSelectionStorageKey(): string {
    return `${MessageLibrary.CALENDAR_SELECTION_TYPE}-${MessageLibrary.CALENDAR_SELECTION_ID}`;
  }

  getChipDisplayName(chip: StateCountryToken): string {
    return `${chip.country}${CalendarSelectorComponent.CHIP_DISPLAY_SEPARATOR}${chip.state}`;
  }

  getChipKey(chip: StateCountryToken): string {
    return `${chip.country}${CalendarSelectorComponent.CHIP_KEY_SEPARATOR}${chip.state}`;
  }

  trackByChip = (_index: number, chip: StateCountryToken): string => {
    return this.getChipKey(chip);
  };

  private setCurrentSelector(): void {
    this.isFirstReadLocal = true;
    const currentEntry = this.currentSelection();
    if (currentEntry) {
      this.dataManagementCalendarSelectionService.currentCalendarSelection =
        currentEntry;
      this.dataManagementCalendarSelectionService.readSChips(true);
    } else {
      this.dataManagementCalendarSelectionService.setCurrentOnEmpty();
    }
    this.changeEvent.emit();
  }

  private setIdToLocalStorage(): void {
    if (!this.isFirstReadLocal) {
      return;
    }

    if (
      this.dataManagementCalendarSelectionService.currentCalendarSelection &&
      this.dataManagementCalendarSelectionService.currentCalendarSelection
        .internal === true
    ) {
      this.localStorageService.remove(this.calendarSelectionStorageKey);
    } else {
      const id =
        this.dataManagementCalendarSelectionService.currentCalendarSelection
          ?.id;

      if (id) {
        this.localStorageService.set(this.calendarSelectionStorageKey, id);
      }
    }
  }

  private setCalendarRule(): void {
    this.resetCountries();
    this.resetStates();

    const selectedCountries = this.selectedCountries();

    this.setCountryFilter(selectedCountries);

    this.dataManagementCalendarSelectionService.chips.forEach((x) => {
      x.select = true;
      this.dataManagementCalendarRulesService.setValue(x);
    });
  }

  private resetCalendarRule(): void {
    this.setCalendarRule();

    if (
      this.dataManagementCalendarSelectionService &&
      this.dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder()
    ) {
      this.delButtonEnabled = false;
    } else {
      this.delButtonEnabled = true;
    }
  }

  private reReadChips(): void {
    this.dataManagementCalendarSelectionService?.readSChips(true);
  }

  private hasLastSelection(): boolean {
    return (
      this.localStorageService.get(this.calendarSelectionStorageKey) !== null
    );
  }

  private currentSelection(): ICalendarSelection | undefined {
    if (this.hasLastSelection()) {
      const currentId = this.localStorageService.get(
        this.calendarSelectionStorageKey
      ) as string;
      return this.dataManagementCalendarSelectionService.calendarsSelections.find(
        (x) => x.id === currentId
      );
    }
    return undefined;
  }

  private parseChipKey(key: string): { country: string; state: string } {
    const [country, state] = key.split(
      CalendarSelectorComponent.CHIP_KEY_SEPARATOR
    );
    return { country, state };
  }

  private findIndexToken(key: string): number | undefined {
    const { country, state } = this.parseChipKey(key);

    return this.dataManagementCalendarSelectionService.currentCalendarSelection?.selectedCalendars.findIndex(
      (x) => x.country === country && x.state === state
    );
  }

  private findToken(key: string): StateCountryToken | undefined {
    const { country, state } = this.parseChipKey(key);
    const index = this.findIndexToken(key);

    if ((index ?? -1) > -1) {
      return this.dataManagementCalendarRulesService.currentFilter.list.find(
        (x) => x.country === country && x.state === state
      );
    }
    return undefined;
  }

  private selectedCountries(): string[] {
    return Array.from(
      new Set(
        this.dataManagementCalendarSelectionService.chips.map(
          (token) => token.country
        )
      )
    );
  }

  private setCountryFilter(selectedCountries: string[]): void {
    if (selectedCountries && selectedCountries.length > 0) {
      this.dataManagementCalendarRulesService.filterStatesByCountries(
        selectedCountries[0]
      );
      this.dataManagementCalendarRulesService.selectedCountry =
        selectedCountries[0];
    }
  }

  private resetStates(): void {
    this.dataManagementCalendarRulesService.currentFilter.countries.forEach(
      (country) => {
        this.dataManagementCalendarRulesService.selectStates(country, false);
      }
    );
  }

  private resetCountries(): void {
    this.dataManagementCalendarRulesService.filterStatesByCountries('');
  }

  private spliceToken(index: number): void {
    this.dataManagementCalendarSelectionService.currentCalendarSelection?.selectedCalendars.splice(
      index,
      1
    );
  }

  private newCalendarSelection() {
    const newItem = new CalendarSelection();
    newItem.name = this.modalService.contentInputString;
    this.dataManagementCalendarSelectionService.chips.forEach((x) => {
      const chip = new SelectedCalendar();
      chip.country = x.country;
      chip.state = x.state;

      newItem.selectedCalendars.push(chip);
    });

    this.dataManagementCalendarSelectionService.addCalendarSelection(newItem);
  }

  private deleteCalendarSelection() {
    const id =
      this.dataManagementCalendarSelectionService.currentCalendarSelection?.id;
    if (id) {
      this.dataManagementCalendarSelectionService.deleteCalendarSelection(id);
    }
  }

  private synchronizeSelectedCalendars() {
    const list =
      this.dataManagementCalendarRulesService.currentFilter.list.filter(
        (x) => x.select === true
      );

    if (this.dataManagementCalendarSelectionService.currentCalendarSelection) {
      this.dataManagementCalendarSelectionService.currentCalendarSelection.selectedCalendars =
        [];
    }

    list.forEach((x) => {
      const item = new SelectedCalendar();
      item.country = x.country;
      item.state = x.state;
      this.dataManagementCalendarSelectionService.currentCalendarSelection?.selectedCalendars.push(
        item
      );
    });

    this.addButtonEnabled = false;
    if (this.dataManagementCalendarSelectionService.currentCalendarSelection) {
      this.addButtonEnabled =
        this.dataManagementCalendarSelectionService.currentCalendarSelection
          .selectedCalendars.length > 0 &&
        !this.dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder();
    }
  }

  private loadTranslations(): void {
    forkJoin({
      headerCalendarDropdown: this.translateService.get(
        'absence-gantt.absence-gantt-mask.absence-gantt-header.setting.chose-holiday'
      ),
      deleteMessage: this.translateService.get(
        'calendar.selector.delete-message'
      ),
      message: this.translateService.get('calendar.selector.store-update'),
      emptyPlaceholder: this.translateService.get('none'),
      inputTitle: this.translateService.get('store.as'),
    })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (results: TranslationResults) => {
          this.headerCalendarDropdown = results.headerCalendarDropdown;
          this.modalService.deleteMessage = results.deleteMessage;
          this.modalService.message = results.message;
          this.modalService.contentInputTitle = results.inputTitle;
          this.dataManagementCalendarSelectionService.emptyPlaceholder =
            results.emptyPlaceholder;
        },
      });
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        if (this.dataManagementCalendarRulesService.isRead()) {
          this.resetCalendarRule();
          this.reReadChips();
          this.setCalendarRule();
        }
      });
      this.effects.push(effect1);

      const effect2 = effect(() => {
        this.addButtonEnabled =
          this.dataManagementCalendarSelectionService.isChanged() ||
          this.shouldEnableAddButton;
      });
      this.effects.push(effect2);

      const effect3 = effect(() => {
        const isRead = this.dataManagementCalendarSelectionService.isRead();
        if (isRead) {
          this.setCurrentSelector();
          this.onChangeSelection();
        }
      });
      this.effects.push(effect3);

      const effect4 = effect(() => {
        const newSel = this.dataManagementCalendarSelectionService.isNew();
        if (newSel) {
          this.addButtonEnabled = false;
          this.dataManagementCalendarSelectionService.saveCurrentSelectedCalendarList(
            newSel
          );
          this.setCurrentSelector();
          this.onChangeSelection();
        }
      });
      this.effects.push(effect4);
    });
  }
}
