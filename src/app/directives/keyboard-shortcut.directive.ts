import { Directive, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { deleteStack } from '../helpers/local-storage-stack';
import { MessageLibrary } from '../helpers/string-constants';
import { LocalStorageService } from '../services/local-storage.service';

@Directive({
  selector: '[appKeyboardShortcut]',
  standalone: false,
})
export class KeyboardShortcutDirective implements OnInit, OnDestroy {
  private router = inject(Router);
  private localStorageService = inject(LocalStorageService);
  private subscription = new Subscription();
  private isAdmin = false;

  ngOnInit() {
    console.log('KeyboardShortcutDirective initialized');

    // Admin-Status aus LocalStorage lesen
    if (this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)) {
      this.isAdmin = JSON.parse(
        this.localStorageService.get(MessageLibrary.TOKEN_ADMIN)!
      );
    }

    // Event-Listener für Alt+Zahl
    this.subscription = fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        filter((event) => {
          const isAltOnly = event.altKey && !event.ctrlKey && !event.shiftKey;

          const isDigit =
            /^[1-9]$/.test(event.key) ||
            (event.code.startsWith('Digit') &&
              /^Digit[1-9]$/.test(event.code)) ||
            (event.code.startsWith('Numpad') &&
              /^Numpad[1-9]$/.test(event.code));

          return isAltOnly && isDigit;
        })
      )
      .subscribe((event) => {
        console.log('Alt+Number shortcut triggered!');
        event.preventDefault();

        let digit;
        if (/^[1-9]$/.test(event.key)) {
          digit = event.key;
        } else if (event.code.startsWith('Digit')) {
          digit = event.code.substring(5);
        } else if (event.code.startsWith('Numpad')) {
          digit = event.code.substring(6);
        }

        console.log('Extracted digit:', digit);
        this.handleShortcut(digit);
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private handleShortcut(digit: string | undefined) {
    console.log('Handling shortcut for digit:', digit);

    switch (digit) {
      case '1':
        this.router.navigate(['/workplace/absence']);
        break;
      case '2':
        this.router.navigate(['/workplace/group']);
        break;
      case '3':
        this.router.navigate(['/workplace/shift']);
        break;
      case '4':
        this.router.navigate(['/workplace/schedule']);
        break;
      case '5':
        deleteStack();
        this.router.navigate(['/workplace/client']);
        break;
      case '7':
        deleteStack();
        this.router.navigate(['/workplace/profile']);
        break;
      case '8':
        if (this.isAdmin) {
          deleteStack();
          this.router.navigate(['/workplace/settings']);
        }
        break;
    }
  }
}
