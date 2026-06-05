// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service that appends a new, empty qualification row to a client.
 * @param client - The client the qualification gets attached to
 */
import { Injectable } from '@angular/core';
import { ClientQualification } from 'src/app/domain/models/client/client-qualification-class';
import { IClient } from 'src/app/domain/models/client/client-class';

@Injectable({
  providedIn: 'root',
})
export class ClientQualificationService {
  public addQualification(client: IClient): IClient {
    const newQualification = new ClientQualification();
    newQualification.clientId = client.id || '';

    client.qualifications = [...client.qualifications, newQualification];

    return client;
  }
}
