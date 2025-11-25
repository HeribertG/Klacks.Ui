import { Injectable, inject, computed } from '@angular/core';
import { AppSettingsManagementService } from './settings/app-settings-management.service';
import { BranchManagementService } from './settings/branch-management.service';

export interface IAddressEntry {
  name: string;
  address: string;
  isAppAddress: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AddressProviderService {
  private appSettingsService = inject(AppSettingsManagementService);
  private branchService = inject(BranchManagementService);

  public allAddresses = computed<IAddressEntry[]>(() => {
    const addresses: IAddressEntry[] = [];
    const contactSettings = this.appSettingsService.contactSettings();
    const branches = this.branchService.branchesList();

    const appName = contactSettings.addressName || contactSettings.name || '';
    const appAddress = this.formatAddress(
      contactSettings.address,
      contactSettings.zip,
      contactSettings.place
    );

    if (appName || appAddress) {
      addresses.push({
        name: appName,
        address: appAddress,
        isAppAddress: true,
      });
    }

    branches.forEach((branch) => {
      if (branch.name || branch.address) {
        addresses.push({
          name: branch.name,
          address: branch.address,
          isAppAddress: false,
        });
      }
    });

    return addresses;
  });

  private formatAddress(address: string, zip: string, place: string): string {
    const parts: string[] = [];

    if (address) {
      parts.push(address);
    }

    const zipPlace = [zip, place].filter(Boolean).join(' ').trim();
    if (zipPlace) {
      parts.push(zipPlace);
    }

    return parts.join(', ');
  }

  getAppAddress(): IAddressEntry | undefined {
    return this.allAddresses().find((addr) => addr.isAppAddress);
  }

  getBranchAddresses(): IAddressEntry[] {
    return this.allAddresses().filter((addr) => !addr.isAppAddress);
  }
}
