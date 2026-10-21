// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the address persona card: field limits, translation keys, dialog options, the context key of its
 * delete confirmation and the ids of the fields focused after the view is initialised.
 */

import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

export const ADDRESS_PERSONA_DELETE_CONTEXT = 'address-persona';

export const ADDRESS_PERSONA_NAME_MAX_LENGTH = 50;
export const ADDRESS_PERSONA_TITLE_MAX_LENGTH = 15;

export const ADDRESS_TYPE_LIST_SEPARATOR = ', ';
export const ADDRESS_TYPE_NOT_ALLOWED_KEY =
  'address.edit-address.address-persona.validation.address-type-not-allowed-for-client-type';
export const ADDRESS_PERSONA_ID_NUMBER_KEY = 'address.edit-address.address-persona.id-number';
export const ADDRESS_PERSONA_STATE_KEY = 'address.edit-address.address-persona.state';
export const ADDRESS_PERSONA_COUNTRY_STATE_KEY_PREFIX = 'address.all-address.all-address-persona.choose-';

export const ADDRESS_PERSONA_DIALOG_OPTIONS: Readonly<NgbModalOptions> = {
  size: 'md',
  centered: true,
  windowClass: 'custom-class',
};
export const ADDRESS_PERSONA_ADDRESS_LIST_DIALOG_OPTIONS: Readonly<NgbModalOptions> = {
  size: 'lg',
  centered: true,
  windowClass: 'custom-class',
};

export const ADDRESS_PERSONA_COMPANY_FIELD_ID = 'profile-company';
export const ADDRESS_PERSONA_FIRST_NAME_FIELD_ID = 'profile-firstname';

export const EXTERNAL_MAP_LINK_TARGET = '_blank';
