// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { IAssistantFunctionCall, IAssistantFunctionResult } from '../../interfaces/assistant-function-definitions.interface';
import { waitForElement } from './assistant-execution-utils';

@Injectable()
export class AssistantExecutionSettingsService {

  executeSettingsGeneralRead(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doSettingsGeneralRead(call));
  }

  private async doSettingsGeneralRead(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    document.getElementById('open-settings')?.click();
    const input = await waitForElement('setting-general-name') as HTMLInputElement;
    if (!input) {
      return { id: call.id, success: false, error: 'Settings page not loaded' };
    }
    const appName = input.value;
    return {
      id: call.id,
      success: true,
      result: { appName, message: `Der aktuelle App-Name ist "${appName}"` },
    };
  }

  executeSettingsGeneralUpdate(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    const { appName } = call.arguments;
    if (!appName) {
      return of({ id: call.id, success: false, error: 'appName parameter is required' });
    }
    return from(this.doSettingsGeneralUpdate(call, appName));
  }

  private async doSettingsGeneralUpdate(call: IAssistantFunctionCall, appName: string): Promise<IAssistantFunctionResult> {
    document.getElementById('open-settings')?.click();
    const input = await waitForElement('setting-general-name') as HTMLInputElement;
    if (!input) {
      return { id: call.id, success: false, error: 'Settings page not loaded' };
    }
    const previousName = input.value;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(input, appName);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      id: call.id,
      success: true,
      result: { previousName, newName: appName, message: `App name changed from "${previousName}" to "${appName}"` },
    };
  }

  executeOwnerAddressRead(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doOwnerAddressRead(call));
  }

  private async doOwnerAddressRead(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    document.getElementById('open-settings')?.click();
    const nameInput = await waitForElement('setting-owner-address-name', 5000) as HTMLInputElement;
    if (!nameInput) {
      return { id: call.id, success: false, error: 'Owner address form not loaded' };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || '';
    const address = {
      addressName: getValue('setting-owner-address-name'),
      phone: getValue('setting-owner-address-tel'),
      supplementAddress: getValue('setting-owner-address-supplement'),
      email: getValue('setting-owner-address-email'),
      street: getValue('setting-owner-address-street'),
      zip: getValue('setting-owner-address-zip'),
      city: getValue('setting-owner-address-city'),
      country: getValue('setting-owner-address-country'),
      state: getValue('setting-owner-address-state'),
    };

    const parts = [
      address.addressName ? `Name: ${address.addressName}` : '',
      address.supplementAddress ? `Zusatz: ${address.supplementAddress}` : '',
      address.street ? `Strasse: ${address.street}` : '',
      address.zip || address.city ? `PLZ/Ort: ${address.zip} ${address.city}`.trim() : '',
      address.state ? `Kanton: ${address.state}` : '',
      address.country ? `Land: ${address.country}` : '',
      address.phone ? `Telefon: ${address.phone}` : '',
      address.email ? `E-Mail: ${address.email}` : '',
    ].filter(Boolean);

    return {
      id: call.id,
      success: true,
      result: { ...address, message: `Inhaberadresse:\n${parts.join('\n')}` },
    };
  }

  executeOwnerAddressUpdate(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doOwnerAddressUpdate(call));
  }

  private async doOwnerAddressUpdate(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    const args = call.arguments;

    document.getElementById('open-settings')?.click();
    const nameInput = await waitForElement('setting-owner-address-name', 5000) as HTMLInputElement;
    if (!nameInput) {
      return { id: call.id, success: false, error: 'Owner address form not loaded' };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const setInput = (id: string, value: string | undefined) => {
      if (!value) return;
      const input = document.getElementById(id) as HTMLInputElement;
      if (!input) return;
      nativeSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const setSelect = (id: string, value: string | undefined) => {
      if (!value) return;
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    setInput('setting-owner-address-name', args['addressName']);
    setInput('setting-owner-address-tel', args['phone']);
    setInput('setting-owner-address-supplement', args['supplementAddress']);
    setInput('setting-owner-address-email', args['email']);
    setInput('setting-owner-address-street', args['street']);
    setInput('setting-owner-address-zip', args['zip']);
    setInput('setting-owner-address-city', args['city']);

    if (args['country']) {
      setSelect('setting-owner-address-country', args['country']);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (args['state']) {
      setSelect('setting-owner-address-state', args['state']);
    }

    return {
      id: call.id,
      success: true,
      result: { message: 'Owner address updated in form' },
    };
  }
}
