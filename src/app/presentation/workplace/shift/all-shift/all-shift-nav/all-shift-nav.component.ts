// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Navigation/filter panel of the shift list: validity flags and period, customer location (multi-select countries and
 * cantons like the client filter, city and zip prefix text) and the original/plannable/container view.
 * @param countrySelection - Checked countries, null = all countries checked (no restriction)
 * @param stateSelection - Checked cantons keyed by country and state, null = all cantons checked (no restriction)
 * @param validFromValue - Date picker value of the first day of the validity period
 * @param validUntilValue - Date picker value of the last day of the validity period
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { NgbDatepickerModule, NgbDateStruct, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { Language } from 'src/app/domain/models/settings/language.type';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import {
  CodeSelection,
  isCodeSelected,
  selectionFromWire,
  toggleCode,
  toWireCodes,
} from 'src/app/domain/helpers/code-selection.helper';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/presentation/helpers/ngb-date.helper';

const STATE_KEY_SEPARATOR = '|';

function stateKey(token: StateCountryToken): string {
  return token.country + STATE_KEY_SEPARATOR + token.state;
}

@Component({
  selector: 'app-all-shift-nav',
  templateUrl: './all-shift-nav.component.html',
  styleUrl: './all-shift-nav.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FontAwesomeModule, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule, TranslateModule, FallbackPipe],
})
export class AllShiftNavComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly navGroupForm = viewChild<NgForm>('navShiftForm');
  navClient: HTMLElement | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);
  private clientConfigService = inject(ClientConfigService);
  public readonly PERMISSIONS = PERMISSIONS;
  private translateService = inject(TranslateService);
  private workplaceStateService = inject(WorkplaceStateService);
  private cdr = inject(ChangeDetectorRef);

  currentLang: Language = DomainMessages.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();
  objectForUnsubscribe: Subscription | undefined;

  isComboBoxOpen = false;

  public faCalendar = faCalendar;
  public readonly countries = this.clientConfigService.countries;
  public readonly countrySelection = signal<CodeSelection>(null);
  public readonly stateSelection = signal<CodeSelection>(null);
  public validFromValue: NgbDateStruct | undefined;
  public validUntilValue: NgbDateStruct | undefined;

  public readonly visibleStates = computed(() => {
    const selection = this.countrySelection();
    return this.clientConfigService.stateList().filter((token) => isCodeSelected(selection, token.country));
  });

  private locationSelectionChanged = false;

  constructor() {
    const filter = this.dataManagementShiftService.currentFilter;
    this.countrySelection.set(selectionFromWire(filter.countries));
    this.stateSelection.set(selectionFromWire(filter.states?.map((pair) => pair.country + STATE_KEY_SEPARATOR + pair.state)));
    this.validFromValue = transformDateToNgbDateStruct(filter.validFrom);
    this.validUntilValue = transformDateToNgbDateStruct(filter.validUntil);

    effect(() => {
      if (this.dataManagementShiftService.isRead()) {
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.checkAdminPermissions();
    if (!this.clientConfigService.isInit()) {
      this.clientConfigService.init();
    }
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClose() {
    this.dataManagementShiftService.readPage(false);
  }

  private applyLocationSelection(): void {
    const filter = this.dataManagementShiftService.currentFilter;
    filter.countries = toWireCodes(
      this.countrySelection(),
      this.countries().map((country) => country.abbreviation),
    );

    const visible = this.visibleStates();
    const wireKeys = new Set(toWireCodes(this.stateSelection(), visible.map(stateKey)));
    filter.states = visible
      .filter((token) => wireKeys.has(stateKey(token)))
      .map((token) => ({ state: token.state, country: token.country }));
    this.locationSelectionChanged = true;
  }

  private checkAdminPermissions(): void {
    if (!this.authorizationService.hasPermission(PERMISSIONS.CanEditShifts)) {
      this.dataManagementShiftService.currentFilter.filterType = 1;
    }
  }

  isCountrySelected(code: string): boolean {
    return isCodeSelected(this.countrySelection(), code);
  }

  isStateSelected(token: StateCountryToken): boolean {
    return isCodeSelected(this.stateSelection(), stateKey(token));
  }

  onCountryToggle(code: string, checked: boolean): void {
    const allCodes = this.countries().map((country) => country.abbreviation);
    this.countrySelection.set(toggleCode(this.countrySelection(), code, checked, allCodes));
    this.applyLocationSelection();
  }

  onStateToggle(token: StateCountryToken, checked: boolean): void {
    const allKeys = this.clientConfigService.stateList().map(stateKey);
    this.stateSelection.set(toggleCode(this.stateSelection(), stateKey(token), checked, allKeys));
    this.applyLocationSelection();
  }

  selectCountries(selected: boolean): void {
    this.countrySelection.set(selected ? null : new Set<string>());
    this.applyLocationSelection();
  }

  selectStates(selected: boolean): void {
    this.stateSelection.set(selected ? null : new Set<string>());
    this.applyLocationSelection();
  }

  onLocationDropdownChange(isOpen: boolean): void {
    if (isOpen || !this.locationSelectionChanged) {
      return;
    }
    this.locationSelectionChanged = false;
    this.onSelect();
  }

  onValidFromChange(value: NgbDateStruct | undefined): void {
    this.validFromValue = value;
    this.dataManagementShiftService.currentFilter.validFrom = value ? transformNgbDateStructToDate(value) : undefined;
  }

  onValidUntilChange(value: NgbDateStruct | undefined): void {
    this.validUntilValue = value;
    this.dataManagementShiftService.currentFilter.validUntil = value ? transformNgbDateStructToDate(value) : undefined;
  }

  onSelect(): void {
    this.dataManagementShiftService.readPage();
    this.workplaceStateService.isFocusChanged.set(true);
  }
}
