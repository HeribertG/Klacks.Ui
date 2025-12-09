import { inject, Injectable, signal } from '@angular/core';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';
import {
  CalendarSelection,
  ICalendarSelection,
  SelectedCalendar,
} from 'src/app/domain/models/calendar-selection-class';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/data-calendar-selection.service';
import { lastValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCalendarSelectionService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private localStorageService = inject(LocalStorageService);
  private dataCalendarSelectionService = inject(DataCalendarSelectionService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  public isRead = signal(false);
  public isChanged = signal(false);
  public isNew = signal<CalendarSelection | undefined>(undefined);
  public chipsLoaded = signal(false);

  public currentCalendarSelection: ICalendarSelection | undefined =
    this.emptyCalendarSelection();
  public chips: StateCountryToken[] = [];
  public emptyPlaceholder = '<Kein>';
  public calendarsSelections: ICalendarSelection[] = [];

  private chipsDummy: StateCountryToken[] = [];

  constructor() {
    this.calendarsSelections.push(this.emptyCalendarSelection());

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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
      .pipe(takeUntil(this.destroy$))
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
        DomainMessages.CALENDAR_SELECTION_TYPE +
          '-' +
          DomainMessages.CALENDAR_SELECTION_ID
      ) as string | null;
      if (savedId) {
        const found = this.calendarsSelections.find((c) => c.id === savedId);
        if (found && !found.internal) {
          const fullSelection = await lastValueFrom(this.dataCalendarSelectionService.getCalendarSelection(savedId));
          if (fullSelection) {
            this.currentCalendarSelection = fullSelection;
          } else {
            this.currentCalendarSelection = found || this.emptyCalendarSelection();
          }
        } else {
          this.currentCalendarSelection = found || this.emptyCalendarSelection();
        }
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
      .pipe(takeUntil(this.destroy$))
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
          this.eventBus.emit(DomainEventType.ERROR, { message: DomainMessages.UNKNOWN_ERROR, code: 'CalendarSelectionError', context: 'DataManagementCalendarSelectionService' });
        });
    }
  }
  deleteCalendarSelection(id: string) {
    lastValueFrom(this.dataCalendarSelectionService.deleteCalendarSelection(id))
      .then(() => {
        this.readData();
      })
      .catch(() => {
        this.eventBus.emit(DomainEventType.ERROR, { message: DomainMessages.UNKNOWN_ERROR, code: 'CalendarSelectionError', context: 'DataManagementCalendarSelectionService' });
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
    this.chipsLoaded.set(false);

    if (this.currentCalendarSelection) {
      this.currentCalendarSelection!.selectedCalendars.forEach((x) => {
        const item = new StateCountryToken();
        item.country = x.country;
        item.state = x.state;

        this.chips.push(item);
      });

      if (this.chips.length > 0) {
        this.chipsLoaded.set(true);
      }

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

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
