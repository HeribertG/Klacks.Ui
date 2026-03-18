// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Storage-Service auf Basis von sessionStorage fuer sitzungsgebundene Filter-Speicherung.
 */

import { Injectable } from '@angular/core';
import { AbstractStorageService } from './abstract-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SessionStorageService extends AbstractStorageService {
  protected readonly storage = sessionStorage;
  protected readonly storageName = 'sessionStorage';
}
