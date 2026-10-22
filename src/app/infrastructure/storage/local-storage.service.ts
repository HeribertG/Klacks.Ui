// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  getJson(key: string): unknown {
    const item = this.get(key);
    if (item) {
      return JSON.parse(item);
    }
    return null;
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }

  clear(): void {
    localStorage.clear();
  }
}
