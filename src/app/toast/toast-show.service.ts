import { inject, Injectable } from '@angular/core';
import { ToastService } from './toast.service';
import { MessageLibrary } from '../helpers/string-constants';

@Injectable({
  providedIn: 'root',
})
export class ToastShowService {
  private toastService = inject(ToastService);

  showInfo(message: string, infoName = '', additionalMessage = '') {
    if (infoName) {
      const y = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(y);
    }
    this.toastService.show(message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
    });
  }

  showError(message: string, errorName = '', additionalMessage = '') {
    if (errorName) {
      const y = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(y);
    }

    this.toastService.show(message, {
      classname: 'bg-danger text-light',
      delay: 8000,
      name: errorName,
      autohide: true,
      headertext: MessageLibrary.ERROR_TOASTTITLE,
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
    });
  }

  showSuccess(message: string, header: string, additionalMessage = '') {
    this.toastService.show(message, {
      classname: 'bg-success text-light',
      delay: 2000,
      autohide: true,
      headertext: header,
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
    });
  }
}
