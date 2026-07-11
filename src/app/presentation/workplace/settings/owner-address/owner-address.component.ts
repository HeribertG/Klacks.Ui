// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, OnInit, effect, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';

import { DomainMessages } from 'src/app/domain/constants/messages';
interface AddressModel {
  addressName: string;
  phone: string;
  supplementAddress: string;
  email: string;
  address: string;
  zip: string;
  place: string;
}

@Component({
  selector: 'app-owner-address',
  templateUrl: './owner-address.component.html',
  styleUrls: ['./owner-address.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, FormsModule, FallbackPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerAddressComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsManagementService);
  public clientConfigService = inject(ClientConfigService);
  public calendarSelectionService = inject(DataManagementCalendarSelectionService);

  private isInitialized = false;
  public selectedCountry = signal<string>('');
  public selectedState = signal<string>('');
  public selectedTimeZone = signal<string>('');
  public selectedCalendarId = signal<string>('');
  public readonly timeZones: string[] = this.loadTimeZones();

  private addressModel = signal<AddressModel>({
    addressName: '',
    phone: '',
    supplementAddress: '',
    email: '',
    address: '',
    zip: '',
    place: '',
  });
  addressForm = form(this.addressModel);

  filteredStateList = computed(() => {
    const country = this.selectedCountry();
    if (!country) return [];
    return this.clientConfigService.stateList().filter(s => s.country === country);
  });

  filteredCalendarSelections = computed(() => {
    const country = this.selectedCountry();
    return this.calendarSelectionService.calendarsSelections.filter(c => {
      if (c.internal) return false;
      if (!country) return true;
      return c.selectedCalendars.some(sc => sc.country === country);
    });
  });

  constructor() {
    effect(() => {
      const model = this.addressModel();
      const country = this.selectedCountry();
      const state = this.selectedState();
      const timeZone = this.selectedTimeZone();
      const calendarId = this.selectedCalendarId();
      if (this.isInitialized) {
        this.appSettingsService.contactSettings.update(s => ({
          ...s,
          addressName: model.addressName,
          phone: model.phone,
          supplementAddress: model.supplementAddress,
          email: model.email,
          address: model.address,
          zip: model.zip,
          place: model.place,
          state: state,
          country: country,
          timeZone: timeZone,
          globalCalendarCountry: country,
          globalCalendarState: state,
          globalCalendarSelectionId: calendarId,
        }));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    this.clientConfigService.init();
    await this.calendarSelectionService.readData();

    const contact = this.appSettingsService.contactSettings();
    this.addressModel.set({
      addressName: contact.addressName,
      phone: contact.phone,
      supplementAddress: contact.supplementAddress,
      email: contact.email,
      address: contact.address,
      zip: contact.zip,
      place: contact.place,
    });
    this.selectedCountry.set(contact.country || contact.globalCalendarCountry || '');
    this.selectedState.set(contact.state || contact.globalCalendarState || '');
    this.selectedTimeZone.set(contact.timeZone || '');
    this.selectedCalendarId.set(contact.globalCalendarSelectionId || '');
    this.isInitialized = true;
  }

  onCountryChange(country: string): void {
    this.selectedCountry.set(country);
    this.selectedState.set('');

    const currentId = this.selectedCalendarId();
    if (currentId) {
      const stillValid = this.filteredCalendarSelections().some(c => c.id === currentId);
      if (!stillValid) {
        this.selectedCalendarId.set('');
      }
    }
  }

  onStateChange(state: string): void {
    this.selectedState.set(state);
  }

  onTimeZoneChange(timeZone: string): void {
    this.selectedTimeZone.set(timeZone);
  }

  private loadTimeZones(): string[] {
    type IntlWithSupportedValues = typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    try {
      return (Intl as IntlWithSupportedValues).supportedValuesOf?.('timeZone') ?? [];
    } catch {
      return [];
    }
  }

  get currentLang(): string {
    return this.translate.currentLang || DomainMessages.DEFAULT_LANG;
  }

  onCalendarSelectionChange(calendarId: string): void {
    this.selectedCalendarId.set(calendarId);
  }
}
