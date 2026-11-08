// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire body of POST Clients/StandIns/{id}/Convert (Klacks.Api ConvertStandInResource): the address, when given, is a new
 * one without id, valid from today (an ISO instant at UTC midnight, like every client date); the communications are new
 * as well.
 */
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { IAddress } from 'src/app/domain/models/client/i-address';
import { ICommunication } from 'src/app/domain/models/client/i-communication';

export interface IConvertStandInRequest {
  targetType: EntityTypeEnum;
  firstName: string;
  name: string;
  gender: GenderEnum;
  address: (Pick<IAddress, 'type' | 'street' | 'zip' | 'city' | 'country'> & { validFrom: string }) | null;
  communications: Pick<ICommunication, 'type' | 'value' | 'prefix'>[];
}
