import { Directive, OnInit, OnDestroy, inject } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MessageLibrary } from '../helpers/string-constants';
import { LocalStorageService } from '../services/local-storage.service';
import { NavigationService } from '../services/navigation.service';

@Directive({
  selector: '[appKeyboardShortcut]',
  standalone: false,
})
export class KeyboardShortcutDirective implements OnInit, OnDestroy {
  private navigationService = inject(NavigationService);
  private localStorageService = inject(LocalStorageService);
  private subscription = new Subscription();
  private isAdmin = false;

  ngOnInit() {
    if (this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)) {
      this.isAdmin = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)!
      );
    }

    this.subscription = fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((event) => {
          if (event === undefined || event.key === undefined) {
            return false;
          }

          const isAltOnly = event.altKey && !event.ctrlKey && !event.shiftKey;
          let isDigit = /^[0-9]$/.test(event.key);

          if (event.code) {
            isDigit =
              isDigit ||
              (event.code.startsWith('Digit') &&
                /^Digit[0-9]$/.test(event.code)) ||
              (event.code.startsWith('Numpad') &&
                /^Numpad[0-9]$/.test(event.code));
          }

          return isAltOnly && isDigit;
        })
      )
      .subscribe((event) => {
        event.preventDefault();

        let digit;
        if (/^[0-9]$/.test(event.key)) {
          digit = event.key;
        } else if (event.code && event.code.startsWith('Digit')) {
          digit = event.code.substring(5);
        } else if (event.code && event.code.startsWith('Numpad')) {
          digit = event.code.substring(6);
        }

        this.handleShortcut(digit);
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private handleShortcut(digit: string | undefined) {
    try {
      switch (digit) {
        case '0':
          this.navigationService.navigateToDashboard();
          break;
        case '1':
          this.navigationService.navigateToAbsence();
          break;
        case '2':
          this.navigationService.navigateToGroup();
          break;
        case '3':
          this.navigationService.navigateToShift();
          break;
        case '4':
          this.navigationService.navigateToSchedule();
          break;
        case '5':
          this.navigationService.navigateToClient();
          break;
        case '7':
          this.navigationService.navigateToProfile();
          break;
        case '8':
          if (this.isAdmin) {
            this.navigationService.navigateToSettings();
          }
          break;
      }
    } catch (error) {
      console.error('Navigation service error:', error);
    }
  }
}
