// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component, ElementRef, forwardRef, Input, inject,
  ChangeDetectionStrategy,
  output,
  viewChild
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MenuItem } from '../context-menu-class';
import { MenuComponent } from '../menu/menu.component';
import { ContextMenuService } from '../context-menu.service';
import { Timer } from 'src/app/presentation/helpers/timer';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, forwardRef(() => MenuComponent)],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemComponent {
  private elementRef = inject(ElementRef);
  private contextMenuService = inject(ContextMenuService);
  private sanitizer = inject(DomSanitizer);

  readonly subMenu = viewChild<MenuComponent>('subMenu');
  readonly appRoot = viewChild.required<ElementRef>('appRoot');
  @Input() menuItem: MenuItem | undefined;
  readonly hasClicked = output<string>();

  private readonly SUBMENU_OVERLAP = 6;
  private readonly SUBMENU_CLOSE_DELAY = 150;
  private myTimer = new Timer();
  private closeTimer = new Timer();

  onClick(): void {
    if (this.menuItem?.disabled) {
      return;
    }
    if (this.menuItem?.hasMenu) {
      this.show();
    } else {
      this.contextMenuService.onClickEvent(
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        this.menuItem?.key!,
        this.menuItem?.valueKey
      );
    }
  }
  onMouseOver(): void {
    this.closeTimer.stop();
    if (this.menuItem?.hasMenu && !this.menuItem?.disabled) {
      this.myTimer.start(() => {
        this.myTimer.stop();
        this.show();
      }, 500);
    }
  }
  onMouseLeave(): void {
    this.myTimer.stop();
    if (this.subMenu()?.isVisible) {
      this.closeTimer.start(() => {
        this.closeTimer.stop();
        const subMenu = this.subMenu();
        if (subMenu?.isVisible) {
          subMenu.closeMenu();
        }
      }, this.SUBMENU_CLOSE_DELAY);
    }
  }

  onSubMenuEnter(): void {
    this.closeTimer.stop();
  }

  onColor(value: string | undefined): string {
    if (value) {
      return value;
    }
    return 'transparent';
  }

  getSanitizedSvg(): SafeHtml | null {
    if (this.menuItem?.svgIcon) {
      return this.sanitizer.bypassSecurityTrustHtml(this.menuItem.svgIcon);
    }
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stopEvent(event: any): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }

  get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  private show(): void {
    const nativeElement: HTMLElement = this.elementRef.nativeElement;
    const boundingRect = nativeElement.getBoundingClientRect();

    const subMenu = this.subMenu();
    if (subMenu) {
      if (subMenu.isVisible) {
        return;
      }
      const openX = this.isRtl
        ? boundingRect.left + this.SUBMENU_OVERLAP
        : boundingRect.right - this.SUBMENU_OVERLAP;
      subMenu.openMenu(
        openX,
        boundingRect.top,
        boundingRect.width,
        boundingRect.height
      );
    }
  }
}
