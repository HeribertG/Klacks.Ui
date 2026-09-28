// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Storage service based on sessionStorage for session-scoped filter storage.
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
