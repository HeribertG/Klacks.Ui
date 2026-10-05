// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toggle button shown in the page headline on narrow screens to open/close the filter navigation panel.
 * @param open - Two-way bound open state of the navigation panel
 * @param filterActive - True when the list is filtered, shows an indicator dot on the button
 * @param label - Translation key of the button text
 * The panel closes on Escape and on clicks outside the button and the nav panel.
 */

import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, model } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nav-toggle',
  templateUrl: './nav-toggle.component.html',
  styleUrls: ['./nav-toggle.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class NavToggleComponent {
  private static readonly PANEL_SELECTOR = '.container-address-nav';

  readonly open = model(false);
  readonly filterActive = input(false);
  readonly label = input('accessibility.filter');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const insideToggleOrPanel = event.composedPath().some(
      (node) =>
        node === this.host.nativeElement ||
        (node instanceof HTMLElement && node.matches(NavToggleComponent.PANEL_SELECTOR)),
    );
    if (!insideToggleOrPanel) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open.update((value) => !value);
  }
}
