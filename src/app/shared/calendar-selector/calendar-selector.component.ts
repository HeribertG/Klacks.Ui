import {
  AfterViewInit,
  Component,
  EventEmitter,
  Injector,
  OnInit,
  Output,
  effect,
  runInInjectionContext,
} from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
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

interface TranslationResults {
  headerCalendarDropdown: string;
  deleteMessage: string;
  message: string;
  emptyPlaceholder: string;
  inputTitle: string;
}

enum ActionType {
  New = 'new',
  Delete = 'del',
  Update = 'update',
}

@Component({
  selector: 'app-calendar-selector',
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss'],
  standalone: false,
})
export class CalendarSelectorComponent implements OnInit, AfterViewInit {
  @Output() openMenu = new EventEmitter();
  @Output() change = new EventEmitter();

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

  private isFirstReadLocal = false;
  private ngUnsubscribe = new Subject<void>();
  private timeToWait = 100;
  private effects: ReturnType<typeof effect>[] = [];

  constructor(
    public dataManagementCalendarSelectionService: DataManagementCalendarSelectionService,
    private translateService: TranslateService,
    private dataManagementCalendarRulesService: DataManagementCalendarRulesService,
    private localStorageService: LocalStorageService,
    private modalService: ModalService,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.dataManagementCalendarRulesService.init();
    this.readSignals();

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
    }).subscribe((results: TranslationResults) => {
      this.headerCalendarDropdown = results.headerCalendarDropdown;
      this.modalService.deleteMessage = results.deleteMessage;
      this.modalService.message = results.message;
      this.modalService.contentInputTitle = results.inputTitle;
      this.dataManagementCalendarSelectionService.emptyPlaceholder =
        results.emptyPlaceholder;
    });
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
      // Hinzufügen eines Debug-Logs
      console.log(
        'Fetching calendar selection with ID:',
        this.dataManagementCalendarSelectionService.currentCalendarSelection.id
      );

      this.resetCalendarRule();
      this.reReadChips();
      setTimeout(() => this.setCalendarRule(), this.timeToWait);
    }

    this.change.emit();
  }

  onChangeFilter(checkIfDirty = false): void {
    this.synchronizeSelectedCalendars();
    this.dataManagementCalendarSelectionService.readSChips(checkIfDirty);

    if (this.dataManagementCalendarSelectionService.isFilterDirty()) {
      this.dataManagementCalendarSelectionService.isChanged.set(true);
    }

    this.change.emit();
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
    setTimeout(() => this.setCalendarRule(), this.timeToWait);
  }

  onDeleteChip(key: string): void {
    const tmp = this.findToken(key);
    const index = this.findIndexToken(key);
    if (tmp && index) {
      tmp.select = false;

      this.spliceToken(index);

      this.change.emit();
    }
    this.dataManagementCalendarSelectionService.readSChips(true);
  }

  get shouldEnableAddButton(): boolean {
    let result = false;
    if (
      this.dataManagementCalendarSelectionService.currentCalendarSelection &&
      this.dataManagementCalendarSelectionService.currentCalendarSelection
        .selectedCalendars
    ) {
      result =
        this.dataManagementCalendarSelectionService.currentCalendarSelection
          ?.selectedCalendars?.length > 0;
    }
    return result;
  }

  private setCurrentSelector(): void {
    this.isFirstReadLocal = true;
    const currentEntry = this.currentEntry();
    if (currentEntry) {
      this.dataManagementCalendarSelectionService.currentCalendarSelection =
        currentEntry;
      this.dataManagementCalendarSelectionService.readSChips(true);
    } else {
      this.dataManagementCalendarSelectionService.setCurrentOnEmpty();
    }
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
      this.localStorageService.remove(
        MessageLibrary.CALENDAR_SELECTION_TYPE +
          '-' +
          MessageLibrary.CALENDAR_SELECTION_ID
      );
    } else {
      const id =
        this.dataManagementCalendarSelectionService.currentCalendarSelection
          ?.id;

      if (id) {
        this.localStorageService.set(
          MessageLibrary.CALENDAR_SELECTION_TYPE +
            '-' +
            MessageLibrary.CALENDAR_SELECTION_ID,
          id
        );
      }
    }
  }

  private setCalendarRule(): void {
    this.resetCountries();
    this.resetStates();

    let selectedCountries = this.selectedCountries();

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

  private hasName(): boolean {
    return (
      this.localStorageService.get(
        MessageLibrary.CALENDAR_SELECTION_TYPE +
          '-' +
          MessageLibrary.CALENDAR_SELECTION_ID
      ) !== null
    );
  }

  private currentEntry(): ICalendarSelection | undefined {
    if (this.hasName()) {
      const currentId = this.localStorageService.get(
        MessageLibrary.CALENDAR_SELECTION_TYPE +
          '-' +
          MessageLibrary.CALENDAR_SELECTION_ID
      ) as string;
      return this.dataManagementCalendarSelectionService.calendarsSelections.find(
        (x) => x.id === currentId
      );
    }
    return undefined;
  }

  private findIndexToken(key: string): number | undefined {
    const value = key.split('|');

    const index =
      this.dataManagementCalendarSelectionService.currentCalendarSelection?.selectedCalendars.findIndex(
        (x) => {
          return x.country === value[0] && x.state === value[1];
        }
      );
    return index;
  }

  private findToken(key: string): StateCountryToken | undefined {
    const value = key.split('|');
    const index = this.findIndexToken(key);
    if (index !== undefined && index > -1) {
      return this.dataManagementCalendarRulesService.currentFilter.list.find(
        (x) => {
          return x.country === value[0] && x.state === value[1];
        }
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
      index!,
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

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effects.push(
        effect(() => {
          const isRead = this.dataManagementCalendarRulesService.isRead();
          if (isRead) {
            this.onChangeSelection();
          }
        })
      );

      this.effects.push(
        effect(() => {
          const isChanged =
            this.dataManagementCalendarSelectionService.isChanged();
          if (isChanged) {
            this.addButtonEnabled = true;
          } else {
            this.addButtonEnabled = this.shouldEnableAddButton;
          }
        })
      );

      this.effects.push(
        effect(() => {
          const isRead = this.dataManagementCalendarSelectionService.isRead();
          if (isRead) {
            this.addButtonEnabled = false;
            this.dataManagementCalendarSelectionService.readSChips();
            this.setCurrentSelector();
            this.change.emit();
          }
        })
      );

      this.effects.push(
        effect(() => {
          const isNew = this.dataManagementCalendarSelectionService.isNew();
          if (isNew) {
            this.addButtonEnabled = false;
            this.dataManagementCalendarSelectionService.saveCurrentSelectedCalendarList(
              isNew
            );
            this.setCurrentSelector();
          }
        })
      );
    });
  }
}
