// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Creates stand-ins (placeholders for persons not in the system yet) in bulk and converts a stand-in into an employee or
 * an external employee. Checks the input with the server's limits first, so the dialogs never show the server's English
 * validation texts, builds the wire bodies (calendar days for the membership, a new address valid from today when the
 * user entered one, only the filled phone and e-mail) and names the i18n key that explains a failure. The address of a
 * conversion is all or nothing: the server geocodes a given address and accepts only a found one, so a person whose
 * address it cannot find is converted without one and gets it in the master data form (which can save anyway).
 * @param dataClientService - Sends the two stand-in requests (with an Idempotency-Key, without retry)
 * @param clientConfigService - Default phone and e-mail communication types of this installation
 */
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { ClientConfigService } from './client-config.service';
import { AddressTypeEnum, EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { IClient } from 'src/app/domain/models/client/i-client';
import { ICommunication } from 'src/app/domain/models/client/i-communication';
import { ICommunicationType } from 'src/app/domain/models/client/i-communication-type';
import { IStandInCreateInput } from 'src/app/domain/models/client/stand-in/stand-in-create-input.interface';
import { IStandInConvertInput } from 'src/app/domain/models/client/stand-in/stand-in-convert-input.interface';
import { ICreatedStandIn } from 'src/app/domain/models/client/stand-in/created-stand-in.interface';
import { IConvertStandInRequest } from 'src/app/domain/models/client/stand-in/convert-stand-in-request.interface';
import { companyToday, formatDateOnly, toCalendarDateWire } from 'src/app/domain/helpers/calendar-date.helper';
import {
  STAND_IN_INDEX_PLACEHOLDER,
  STAND_IN_MAX_BULK_COUNT,
  STAND_IN_MAX_NAME_PATTERN_LENGTH,
  STAND_IN_PERSON_NAME_MAX_LENGTH,
  STAND_IN_I18N,
} from 'src/app/domain/constants/stand-in.constants';
import { StandInMessage } from 'src/app/domain/models/client/stand-in/stand-in-message.interface';
import {
  ADDRESS_VALIDATION_FAILED_KEY,
  readAddressValidationFailure,
} from 'src/app/domain/helpers/address-validation-failure.helper';

const CONVERSION_TARGET_TYPES: readonly EntityTypeEnum[] = [EntityTypeEnum.employee, EntityTypeEnum.externEmp];
const PERSON_GENDERS: readonly GenderEnum[] = [GenderEnum.female, GenderEnum.male, GenderEnum.intersexuality];
const NO_COMMUNICATION_TYPE = -1;
const PARTS_AROUND_ONE_PLACEHOLDER = 2;

@Injectable({
  providedIn: 'root',
})
export class StandInService {
  private dataClientService = inject(DataClientService);
  private clientConfigService = inject(ClientConfigService);

  /** The first problem of the input, or null when the server would accept it. */
  validateCreate(input: IStandInCreateInput): StandInMessage | null {
    const count = input.count;
    if (count === null || !Number.isInteger(count) || count < 1 || count > STAND_IN_MAX_BULK_COUNT) {
      return { key: STAND_IN_I18N.invalidCount, params: { max: STAND_IN_MAX_BULK_COUNT } };
    }

    if (!this.isValidNamePattern(input.namePattern)) {
      return {
        key: STAND_IN_I18N.invalidPattern,
        params: { placeholder: STAND_IN_INDEX_PLACEHOLDER, max: STAND_IN_MAX_NAME_PATTERN_LENGTH },
      };
    }

    if (!input.groupId) {
      return { key: STAND_IN_I18N.invalidGroup };
    }

    if (!input.validFrom || (input.validUntil && formatDateOnly(input.validUntil) < formatDateOnly(input.validFrom))) {
      return { key: STAND_IN_I18N.invalidPeriod };
    }

    return null;
  }

  createStandIns(input: IStandInCreateInput): Observable<ICreatedStandIn[]> {
    return this.dataClientService.createStandIns({
      count: input.count ?? 0,
      namePattern: input.namePattern.trim(),
      groupId: input.groupId,
      validFrom: formatDateOnly(input.validFrom ?? companyToday()),
      validUntil: input.validUntil ? formatDateOnly(input.validUntil) : null,
      qualificationIds: [...new Set(input.qualificationIds)],
    });
  }

  /** The first problem of the input, or null when the server would accept it. */
  validateConvert(input: IStandInConvertInput): StandInMessage | null {
    const hasPerson =
      CONVERSION_TARGET_TYPES.includes(input.targetType) &&
      this.isValidPersonName(input.firstName) &&
      this.isValidPersonName(input.name) &&
      input.gender !== null &&
      PERSON_GENDERS.includes(input.gender);
    if (!hasPerson) {
      return { key: STAND_IN_I18N.invalidPerson, params: { max: STAND_IN_PERSON_NAME_MAX_LENGTH } };
    }

    const filledAddressParts = this.addressParts(input).filter((value) => this.isFilled(value)).length;
    if (filledAddressParts > 0 && filledAddressParts < this.addressParts(input).length) {
      return { key: STAND_IN_I18N.invalidAddress };
    }

    return null;
  }

  convertStandIn(clientId: string, input: IStandInConvertInput): Observable<IClient> {
    return this.dataClientService.convertStandIn(clientId, this.buildConvertRequest(input));
  }

  /** The text that explains a refused create or convert; a refused address names the geocoding failure. */
  failureMessage(error: unknown, fallbackKey: string): StandInMessage {
    const refusedAddress = readAddressValidationFailure(error);
    if (refusedAddress !== null) {
      return { key: ADDRESS_VALIDATION_FAILED_KEY, params: { address: refusedAddress } };
    }

    return { key: fallbackKey };
  }

  private buildConvertRequest(input: IStandInConvertInput): IConvertStandInRequest {
    const communications: Pick<ICommunication, 'type' | 'value' | 'prefix'>[] = [];
    this.addCommunication(communications, input.phone, this.clientConfigService.defaultTypePhone(), this.clientConfigService.communicationTypePhoneList());
    this.addCommunication(communications, input.email, this.clientConfigService.defaultTypeEmail(), this.clientConfigService.communicationTypeEmailList());

    return {
      targetType: input.targetType,
      firstName: input.firstName.trim(),
      name: input.name.trim(),
      gender: input.gender ?? GenderEnum.female,
      address: this.addressParts(input).every((value) => this.isFilled(value))
        ? {
            type: AddressTypeEnum.customer,
            street: input.street.trim(),
            zip: input.zip.trim(),
            city: input.city.trim(),
            country: input.country,
            validFrom: toCalendarDateWire(companyToday()),
          }
        : null,
      communications,
    };
  }

  private addCommunication(
    target: Pick<ICommunication, 'type' | 'value' | 'prefix'>[],
    value: string,
    defaultType: number,
    types: ICommunicationType[],
  ): void {
    const type = defaultType !== NO_COMMUNICATION_TYPE ? defaultType : types[0]?.type;
    if (!this.isFilled(value) || type === undefined) {
      return;
    }

    target.push({ type, value: value.trim(), prefix: '' });
  }

  private addressParts(input: IStandInConvertInput): string[] {
    return [input.street, input.zip, input.city, input.country];
  }

  private isValidNamePattern(pattern: string): boolean {
    const trimmed = pattern.trim();
    return (
      trimmed.split(STAND_IN_INDEX_PLACEHOLDER).length === PARTS_AROUND_ONE_PLACEHOLDER &&
      trimmed.length <= STAND_IN_MAX_NAME_PATTERN_LENGTH &&
      this.isFilled(trimmed.replace(STAND_IN_INDEX_PLACEHOLDER, ''))
    );
  }

  private isValidPersonName(value: string): boolean {
    return this.isFilled(value) && value.trim().length <= STAND_IN_PERSON_NAME_MAX_LENGTH;
  }

  private isFilled(value: string | null | undefined): boolean {
    return !!value && value.trim() !== '';
  }
}
