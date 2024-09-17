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

  getJson(key: string): any {
    const item = this.get(key);
    if (item) {
      return JSON.parse(item);
    }
    return null;
  }

  setJson(key: string, value: any): void {
    this.set(key, JSON.stringify(value));
  }

  clear(): void {
    localStorage.clear();
  }
}
