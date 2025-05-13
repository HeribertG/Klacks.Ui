import { inject, Injectable, signal } from '@angular/core';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import {
  CalendarSelection,
  ICalendarSelection,
  SelectedCalendar,
} from 'src/app/core/calendar-selection-class';
import { ToastService } from 'src/app/toast/toast.service';
import { DataCalendarSelectionService } from '../data-calendar-selection.service';
import { lastValueFrom } from 'rxjs';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarSelectionService {
  public toastService = inject(ToastService);
  private localStorageService = inject(LocalStorageService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);

  public isRead = signal(false);
  public isChanged = signal(false);
  public isNew = signal<CalendarSelection | undefined>(undefined);

  public currentCalendarSelection: ICalendarSelection | undefined =
    this.emptyCalendarSelection();
  public chips: StateCountryToken[] = [];
  public emptyPlaceholder = '<Kein>';
  public calendarsSelections: ICalendarSelection[] = [];

  private chipsDummy: StateCountryToken[] = [];

  constructor() {
    this.calendarsSelections.push(this.emptyCalendarSelection());
  }

  setCurrentOnEmpty() {
    this.currentCalendarSelection = this.emptyCalendarSelection();
  }

  isCurrentCalendarSelectionEmptyPlaceholder(): boolean {
    if (this.currentCalendarSelection?.internal) {
      return this.currentCalendarSelection?.internal === true;
    }

    return false;
  }

  addCalendarSelection(value: CalendarSelection) {
    delete value.id;
    value.selectedCalendars.forEach((x) => {
      delete x.id;
    });
    this.dataCalendarSelectionService
      .addCalendarSelection(value)
      .subscribe((x: CalendarSelection | undefined) => {
        if (x) {
          this.readData();
          this.isNew.set(x);
        }
      });
  }

  readData() {
    this.dataCalendarSelectionService
      .getList()
      .subscribe((x: CalendarSelection[] | undefined) => {
        this.calendarsSelections = [
          this.emptyCalendarSelection(),
          ...(x || []),
        ];
        // ↓ Neue Zeilen:
        const savedId = this.localStorageService.get(
          MessageLibrary.CALENDAR_SELECTION_TYPE +
            '-' +
            MessageLibrary.CALENDAR_SELECTION_ID
        ) as string | null;
        if (savedId) {
          this.currentCalendarSelection =
            this.calendarsSelections.find((c) => c.id === savedId) ||
            this.emptyCalendarSelection();
        }
        // ↑ Ende Ergänzung
        this.isRead.set(true);
        this.isRead.set(false);
      });
  }

  getCalendarSelection(id: string) {
    this.dataCalendarSelectionService
      .getCalendarSelection(id)
      .subscribe((calendarSelection: CalendarSelection | undefined) => {
        if (calendarSelection) {
          this.currentCalendarSelection = calendarSelection;
          this.readSChips(true);

          this.isRead.set(true);
        }
      });
  }

  updateCalendarSelection() {
    if (this.currentCalendarSelection) {
      this.currentCalendarSelection.selectedCalendars.forEach((x) => {
        if (!x.id) {
          delete x.id;
        }
      });

      lastValueFrom(
        this.dataCalendarSelectionService.updateCalendarSelection(
          this.currentCalendarSelection
        )
      )
        .then(() => {
          this.readData();
        })
        .catch((x) => {
          this.showError(MessageLibrary.UNKNOWN_ERROR);
        });
    }
  }
  deleteCalendarSelection(id: string) {
    lastValueFrom(this.dataCalendarSelectionService.deleteCalendarSelection(id))
      .then(() => {
        this.readData();
      })
      .catch((x) => {
        this.showError(MessageLibrary.UNKNOWN_ERROR);
      });
  }

  saveCurrentSelectedCalendarList(parent: CalendarSelection) {
    this.chips.forEach((x) => {
      const value = new SelectedCalendar();
      value.calendarSelection = parent;
      value.country = x.country;
      value.state = x.state;
      this.dataCalendarSelectionService.addSelectedCalendar(value);
    });
  }

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  private emptyCalendarSelection(): CalendarSelection {
    const tmp = new CalendarSelection();
    tmp.internal = true;
    tmp.name = this.emptyPlaceholder;
    return tmp;
  }

  readSChips(checkIfDirty = false) {
    if (checkIfDirty && this.isFilterDirty()) {
      this.isChanged.set(true);
    }

    this.chips = [];

    if (this.currentCalendarSelection) {
      this.currentCalendarSelection!.selectedCalendars.forEach((x) => {
        const item = new StateCountryToken();
        item.country = x.country;
        item.state = x.state;

        this.chips.push(item);
      });

      if (checkIfDirty) {
        this.chipsDummy = cloneObject<StateCountryToken[]>(this.chips);
        if (this.isFilterDirty()) {
          this.isChanged.set(true);
        } else {
          this.isChanged.set(false);
        }
      }
    }
  }

  isFilterDirty(): boolean {
    const a = this.chips as StateCountryToken[];
    const b = this.chipsDummy as StateCountryToken[];
    const list: string[] = Array(1).fill('select');

    const result = !compareComplexObjects(a, b, list);

    return result;
  }

  private sort(values: CalendarSelection[]): void {
    values.sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';

      return nameA.localeCompare(nameB);
    });
  }
}
