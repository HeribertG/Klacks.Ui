import { Injectable, TemplateRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  constructor() {}

  toasts: any[] = [];

  show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    if (textOrTpl !== '') {
      if (!this.findToast(textOrTpl.toString())) {
        this.toasts.push({ textOrTpl, ...options });
      }
    }
  }

  remove(toast: any) {
    this.toasts = this.toasts.filter((t) => t !== toast);
  }

  findToast(text: string): boolean {
    const toast = this.toasts.filter((t) => t.textOrTpl.toString() === text);

    if (toast && toast.length > 0) {
      return true;
    }

    return false;
  }
}
