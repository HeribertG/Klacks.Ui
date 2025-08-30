import { inject, Injectable, signal } from '@angular/core';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';
import {
  CalendarSelection,
  ICalendarSelection,
  SelectedCalendar,
} from 'src/app/domain/models/calendar-selection-class';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/data-calendar-selection.service';
import { lastValueFrom } from 'rxjs';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/domain/helpers/object-helpers';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarSelectionService {
  public toastShowService = inject(ToastShowService);
  private localStorageService = inject(LocalStorageService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);
  private translate = inject(TranslateService);

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

    this.translate.onLangChange.subscribe(() => {
      this.updateEmptyPlaceholder();
    });

    this.updateEmptyPlaceholder();
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
      .subscribe(async (x: CalendarSelection | undefined) => {
        if (x) {
          await this.readData();
          this.isNew.set(x);
        }
      });
  }

  async readData(): Promise<void> {
    this.isRead.set(false);
    
    try {
      const x = await lastValueFrom(this.dataCalendarSelectionService.getList());
      this.calendarsSelections = [
        this.emptyCalendarSelection(),
        ...(x || []),
      ];
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
      this.isRead.set(true);
    } catch (error) {
      console.error('Error loading calendar selections:', error);
      this.isRead.set(true);
    }
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
        .then(async () => {
          await this.readData();
        })
        .catch(() => {
          this.toastShowService.showError(MessageLibrary.UNKNOWN_ERROR);
        });
    }
  }
  deleteCalendarSelection(id: string) {
    lastValueFrom(this.dataCalendarSelectionService.deleteCalendarSelection(id))
      .then(() => {
        this.readData();
      })
      .catch(() => {
        this.toastShowService.showError(MessageLibrary.UNKNOWN_ERROR);
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

  private updateEmptyPlaceholder(): void {
    this.emptyPlaceholder = this.translate.instant('none');
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
