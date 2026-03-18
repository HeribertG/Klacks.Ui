// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { BaseEntity } from '../general-class';
import { IMembership } from './i-membership';
import { IAddress } from './i-address';
import { ICommunication } from './i-communication';
import { IAnnotation } from './i-annotation';
import { IClientContract } from './i-client-contract';
import { IClientGroupItem } from './client-group-item-class';
import { IClientImage } from './i-client-image';

export interface IClient extends BaseEntity {
  id: string | undefined;
  idNumber: number;
  company: string;
  title: string;
  name: string;
  firstName: string;
  secondName: string;
  maidenName: string;
  birthdate: Date | undefined;
  membership: IMembership | undefined;
  gender: number;
  legalEntity: boolean;
  type: number | string;
  addresses: IAddress[];
  communications: ICommunication[];
  annotations: IAnnotation[];
  clientContracts: IClientContract[];
  groupItems: IClientGroupItem[];
  clientImage: IClientImage | undefined;

  hasFutureAddress: boolean;
  hasPastAddress: boolean;
  hasScopeAddress: boolean;

  typeAbbreviation: string | undefined;
}
