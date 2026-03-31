// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Menu } from '../context-menu-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { CommonModule } from '@angular/common';
import { MenuItemComponent } from '../menu-item/menu-item.component';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    forwardRef(() => MenuItemComponent),
    ClickOutsideDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent {
  @Input() menu: Menu | undefined;
  @Output() mouseEntered = new EventEmitter<void>();
  @ViewChild('appRoot', { static: false }) appRoot!: ElementRef;

  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);

  isVisible = false;
  rightPanelStyle: any = {};
  parentRect = new Rectangle();
  private animationFrameId: number | null = null;

  private get isRtl(): boolean {
    return document.documentElement.dir === 'rtl';
  }

  openMenu(
    clientX: number,
    clientY: number,
    width: number,
    height: number
  ): void {
    if (this.isVisible) {
      return;
    }

    this.parentRect.left = clientX;
    this.parentRect.bottom = clientY;
    this.parentRect.right = clientX + width;
    this.parentRect.top = clientY - height;

    this.rightPanelStyle = {
      display: 'block',
      position: 'fixed',
      'left.px': clientX,
      'top.px': clientY,
      opacity: 0,
    };
    this.isVisible = true;
    this.cdr.detectChanges();
    this.animationFrameId = requestAnimationFrame(() => {
      this.recalcPosition();
      this.cdr.detectChanges();
    });
  }

  closeMenu(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isVisible = false;
    this.rightPanelStyle = { display: 'none' };
    this.cdr.markForCheck();
  }

  onMouseEnter(): void {
    this.mouseEntered.emit();
  }

  stopEvent(event: any): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }

  private isElementInViewport(): [x: number, y: number] {
    const nativeElement: HTMLElement = this.elementRef.nativeElement;
    const div = nativeElement.children[0] as HTMLDivElement;

    let top = this.parentRect.top;
    let left = this.parentRect.left;

    const width = div.offsetWidth;
    const height = div.offsetHeight;
    let y = 0;
    let x = 0;

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    if (this.parentRect.width > 0 && this.parentRect.height > 0) {
      const res = this.getPosition(div);
      top = res[1];
      left = res[0];

      if (top + height >= viewportHeight) {
        y = -(height - this.parentRect.height) + 4;
      }

      if (top + y < 0) {
        y = -top;
      }

      if (this.isRtl) {
        if (left - width < 0) {
          x = this.parentRect.width + width - 4;
        }
      } else {
        if (left + width >= viewportWidth) {
          x = -(this.parentRect.width + width) + 4;
        }
      }
    } else {
      if (top + height >= viewportHeight) {
        y = -height + 8;
      }

      if (top + y < 0) {
        y = -top;
      }

      if (this.isRtl) {
        if (left - width < 0) {
          x = width - 8;
        }
      } else {
        if (left + width >= viewportWidth) {
          x = -width + 8;
        }
      }
    }

    return [x, y];
  }

  private recalcPosition(): void {
    const nativeElement: HTMLElement = this.elementRef.nativeElement;
    const menuWidth = nativeElement.children[0].clientWidth + 4;
    const menuHeight = nativeElement.children[0].clientHeight + 4;

    if (menuWidth > 0 && menuHeight > 0) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      const res = this.isElementInViewport();
      const leftPos = this.isRtl
        ? this.parentRect.left - menuWidth + res[0]
        : this.parentRect.left + res[0];
      this.rightPanelStyle = {
        display: 'block',
        position: 'fixed',
        'left.px': leftPos,
        'top.px': this.parentRect.bottom + res[1],
        opacity: 1,
      };
    }
  }

  private getPosition(element: HTMLElement): [x: number, y: number] {
    let x = 0;
    let y = 0;
    while (element) {
      x += element.offsetLeft - element.scrollLeft + element.clientLeft;
      y += element.offsetTop - element.scrollTop + element.clientTop;
      element = element.offsetParent as HTMLElement;
    }
    return [x, y];
  }
}
