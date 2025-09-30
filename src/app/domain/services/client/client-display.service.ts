import { Injectable } from '@angular/core';
import { Address, Client } from '../../models/client-class';
import { AddressTypeEnum, GenderEnum } from '../../enums/client-enum';

@Injectable({
  providedIn: 'root',
})
export class ClientDisplayService {
  createHTMLAddress(client: Client, currentAddress: Address): string {
    let address = '';

    if (currentAddress) {
      if (currentAddress.type === AddressTypeEnum.customer) {
        if (client.company) {
          address += client.company;
          address += '<br>';
        }
        if (client.title) {
          address += client.title;
          address += '<br>';
        }

        address += client.firstName;
        address += ' ';
        if (client.secondName) {
          address += client.secondName.substring(0, 1);
          address += '. ';
        }
        address += client.name;
        address += '<br>';
        if (currentAddress.street) {
          address += currentAddress.street;
          address += '<br>';
        }
        if (currentAddress.street2) {
          address += currentAddress.street2;
          address += '<br>';
        }
        if (currentAddress.street3) {
          address += currentAddress.street3;
          address += '<br>';
        }
        address += currentAddress.zip;
        address += ' ';
        address += currentAddress.city;
        address += '<br>';
      } else {
        if (currentAddress.addressLine1) {
          address += currentAddress.addressLine1;
          address += '<br>';
        }
        if (currentAddress.addressLine2) {
          address += currentAddress.addressLine2;
          address += '<br>';
        }
        if (currentAddress.street) {
          address += currentAddress.street;
          address += '<br>';
        }
        if (currentAddress.street2) {
          address += currentAddress.street2;
          address += '<br>';
        }
        if (currentAddress.street3) {
          address += currentAddress.street3;
          address += '<br>';
        }
        address += currentAddress.zip;
        address += ' ';
        address += currentAddress.city;
        address += '<br>';
      }
    } else {
      address = 'keine Adresse';
    }

    return address;
  }

  readGender(client: Client): string {
    switch (+client.gender as GenderEnum) {
      case GenderEnum.female:
        return 'Frau';

      case GenderEnum.male:
        return 'Herr';
    }
    return '';
  }

  readSalutation(client: Client): string {
    switch (+client.gender as GenderEnum) {
      case GenderEnum.female:
        return 'Sehr geehrte Frau ';

      case GenderEnum.male:
        return 'Sehr geehrter Herr ';
    }
    return 'Werte Damen und Herren ';
  }

  getHtmlWrapString(str: string): string {
    str = str.replace('\r\n', '\n');
    str = str.replace('\r', '\n');
    const spl = str.split('\n');

    let res = '';
    if (spl.length > 1) {
      for (let i = 0; i < spl.length; i++) {
        const item = spl[i];

        if (i < spl.length - 1) {
          res += item + '<br>';
        } else {
          res += item;
        }
      }
    } else {
      res = str;
    }

    return res;
  }

  francAmounts(value: number): string {
    return Math.floor(value).toString();
  }
  centAmounts(value: number): string {
    const s1 = Math.floor(value);
    const res = ((value * 100 - s1 * 100) / 100).toString();
    let result = res.substring(2, 4);

    if (result.length === 0) {
      result += '00';
    }
    if (result.length === 1) {
      result += '0';
    }

    return result;
  }
}
