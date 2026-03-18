// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Storage-Service auf Basis von localStorage fuer persistente Filter-Speicherung.
 */

import { Injectable } from '@angular/core';
import { AbstractStorageService } from './abstract-storage.service';

@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService extends AbstractStorageService {
  protected readonly storage = localStorage;
  protected readonly storageName = 'localStorage';
}
