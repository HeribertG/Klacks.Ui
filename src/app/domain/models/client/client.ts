// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain model for a client entity with default initialization.
 * @param addresses - Client's address list, initialized with one empty Address
 * @param annotations - Client's annotation list, initialized with one empty Annotation
 */

import { BaseEntity } from '../general-class';
import { GenderEnum } from 'src/app/domain/enums/client-enum';
import { IClient } from './i-client';
import { IAddress } from './i-address';
import { ICommunication } from './i-communication';
import { IAnnotation } from './i-annotation';
import { IClientContract } from './i-client-contract';
import { IClientGroupItem } from './client-group-item-class';
import { IClientQualification } from './client-qualification-class';
import { IClientImage } from './i-client-image';
import { Address } from './address';
import { Annotation } from './annotation';
import { Membership } from './membership';

export class Client extends BaseEntity implements IClient {
  constructor() {
    super();
    this.communications = [];

    const addr = new Address();
    this.addresses = [addr];

    const ann = new Annotation();
    this.annotations = [ann];

    this.clientContracts = [];
    this.groupItems = [];
    this.qualifications = [];
  }

  id = '';
  idNumber = -1;
  company = '';
  title = '';
  name = '';
  firstName = '';
  secondName = '';
  maidenName = '';
  birthdate = new Date();
  gender: number = GenderEnum.female;
  legalEntity = false;
  type = 0;

  membership = new Membership();
  addresses: IAddress[];
  communications: ICommunication[];
  annotations: IAnnotation[];
  clientContracts: IClientContract[];
  groupItems: IClientGroupItem[];
  qualifications: IClientQualification[];
  clientImage: IClientImage | undefined = undefined;

  hasFutureAddress = false;
  hasPastAddress = false;
  hasScopeAddress = false;

  typeAbbreviation = undefined;
}
