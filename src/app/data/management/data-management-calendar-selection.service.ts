import { Injectable } from '@angular/core';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import {
  CalendarSelection,
  ICalendarSelection,
  SelectedCalendar,
} from 'src/app/core/calendar-selection-class';
import { ToastService } from 'src/app/toast/toast.service';
import { DataCalendarSelectionService } from '../data-calendar-selection.service';
import { Subject, lastValueFrom } from 'rxjs';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarSelectionService {
  public isRead = new Subject<boolean>();
  public isChanged = new Subject<boolean>();
  public isNew = new Subject<CalendarSelection>();

  currentCalendarSelection: ICalendarSelection | undefined =
    this.emptyCalendarSelection();
  chips: StateCountryToken[] = [];
  chipsDummy: StateCountryToken[] = [];

  emptyPlaceholder = '<Kein>';

  calendarsSelections: ICalendarSelection[] = [];
  constructor(
    public toastService: ToastService,
    private dataCalendarSelectionService: DataCalendarSelectionService
  ) {
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
          this.isNew.next(x);
        }
      });
  }

  readData() {
    this.dataCalendarSelectionService
      .getList()
      .subscribe((x: CalendarSelection[] | undefined) => {
        this.calendarsSelections = [];
        this.calendarsSelections.push(this.emptyCalendarSelection());
        if (x) {
          this.sort(x);
          this.calendarsSelections.push(...x);
        }

        this.isRead.next(true);
      });
  }

  getCalendarSelection(id: string) {}

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
      this.isChanged.next(true);
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
        this.chipsDummy = cloneObject(this.chips);
      }
    }
  }

  isFilterDirty(): boolean {
    const a = this.chips as StateCountryToken[];
    const b = this.chipsDummy as StateCountryToken[];
    const list: string[] = Array(1).fill('select');

    if (!compareComplexObjects(a, b, list)) {
      return true;
    }
    return false;
  }

  private sort(values: CalendarSelection[]): void {
    values.sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';

      return nameA.localeCompare(nameB);
    });
  }
}
