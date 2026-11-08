// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { readAddressValidationFailure } from './address-validation-failure.helper';

describe('readAddressValidationFailure', () => {
  const refusal = (errors: Record<string, string[]>) => new HttpErrorResponse({ status: 400, error: { errors } });

  it('reads the refused address of a geocoding refusal', () => {
    expect(readAddressValidationFailure(refusal({ Address: ['address.validation.failed|Hauptstrasse 1, 3000 Bern'] }))).toBe(
      'Hauptstrasse 1, 3000 Bern',
    );
  });

  it('takes the first refusal that names an address and answers empty when none does', () => {
    expect(
      readAddressValidationFailure(
        refusal({ A: ['address.validation.failed'], B: ['address.validation.failed|Gasse 2, 8000 Zürich'] }),
      ),
    ).toBe('Gasse 2, 8000 Zürich');
    expect(readAddressValidationFailure(refusal({ A: ['address.validation.failed'] }))).toBe('');
  });

  it('answers null for any other failure', () => {
    expect(readAddressValidationFailure(refusal({ Name: ['Name is required'] }))).toBeNull();
    expect(readAddressValidationFailure(new HttpErrorResponse({ status: 500 }))).toBeNull();
    expect(readAddressValidationFailure(undefined)).toBeNull();
  });
});
