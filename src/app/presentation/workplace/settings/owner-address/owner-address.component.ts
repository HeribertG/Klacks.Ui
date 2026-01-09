import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { form, Field } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';

interface AddressModel {
  addressName: string;
  phone: string;
  supplementAddress: string;
  email: string;
  address: string;
  zip: string;
  place: string;
  state: string;
  country: string;
}

@Component({
  selector: 'app-owner-address',
  templateUrl: './owner-address.component.html',
  styleUrls: ['./owner-address.component.scss'],
  standalone: true,
  imports: [TranslateModule, Field],
})
export class OwnerAddressComponent implements OnInit {
  public translate = inject(TranslateService);
  private appSettingsService = inject(AppSettingsManagementService);

  private isInitialized = false;
  private addressModel = signal<AddressModel>({
    addressName: '',
    phone: '',
    supplementAddress: '',
    email: '',
    address: '',
    zip: '',
    place: '',
    state: '',
    country: '',
  });
  addressForm = form(this.addressModel);

  constructor() {
    effect(() => {
      const model = this.addressModel();
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
          state: model.state,
          country: model.country,
        }));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    const contact = this.appSettingsService.contactSettings();
    this.addressModel.set({
      addressName: contact.addressName,
      phone: contact.phone,
      supplementAddress: contact.supplementAddress,
      email: contact.email,
      address: contact.address,
      zip: contact.zip,
      place: contact.place,
      state: contact.state,
      country: contact.country,
    });
    this.isInitialized = true;
  }
}
