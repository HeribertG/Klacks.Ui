import { Component, OnInit, effect, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';

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
  imports: [TranslateModule, Field, FormsModule, FallbackPipe],
})
export class OwnerAddressComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsManagementService);
  public clientConfigService = inject(ClientConfigService);
  public calendarSelectionService = inject(DataManagementCalendarSelectionService);

  private isInitialized = false;
  public selectedCountry = signal<string>('');
  public selectedState = signal<string>('');
  public selectedCalendarId = signal<string>('');

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

  constructor() {
    effect(() => {
      const model = this.addressModel();
      const country = this.selectedCountry();
      const state = this.selectedState();
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
    this.selectedCalendarId.set(contact.globalCalendarSelectionId || '');
    this.isInitialized = true;
  }

  onCountryChange(country: string): void {
    this.selectedCountry.set(country);
    this.selectedState.set('');
  }

  onStateChange(state: string): void {
    this.selectedState.set(state);
  }

  get currentLang(): string {
    return this.translate.currentLang || 'de';
  }

  onCalendarSelectionChange(calendarId: string): void {
    this.selectedCalendarId.set(calendarId);
  }
}
