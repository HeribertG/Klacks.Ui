import { inject, Injectable } from '@angular/core';
import { ToastService } from './toast.service';
import { MessageLibrary } from '../helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class ToastShowService {
  private toastService = inject(ToastService);

  showInfo(Message: string, infoName = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(Message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
    });
  }

  showError(Message: string, errorName = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(Message, {
      classname: 'bg-danger text-light',
      delay: 3000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
    });
  }

  showSuccess(message: string, header: string) {
    this.toastService.show(message, {
      classname: 'bg-success text-light',
      delay: 2000,
      autohide: true,
      headertext: header,
    });
  }
}
