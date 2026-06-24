// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Core toast management service that maintains the toast array.
 * @param toasts - Array of active toast notifications
 * @param show - Adds a new toast with optional interactive config
 * @param remove - Removes a toast from display
 */

import { Injectable, signal } from '@angular/core';
import { IToast } from './toast.interface';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private idCounter = 0;

  readonly toasts = signal<IToast[]>([]);

  show(textOrTpl: string, options: Partial<IToast> = {}): IToast | null {
    if (textOrTpl === '') return null;

    if (this.findToast(textOrTpl.toString())) return null;

    const toast: IToast = {
      id: `toast_${++this.idCounter}_${Date.now()}`,
      textOrTpl,
      ...options,
    };

    this.toasts.update(arr => [...arr, toast]);
    return toast;
  }

  remove(toast: IToast | undefined): void {
    if (!toast) return;
    this.toasts.update(arr => arr.filter((t) => t.id !== toast.id));
  }

  removeById(id: string): void {
    this.toasts.update(arr => arr.filter((t) => t.id !== id));
  }

  findToast(text: string): boolean {
    return this.toasts().some((t) => t.textOrTpl.toString() === text);
  }
}
