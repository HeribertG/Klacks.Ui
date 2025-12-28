/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import { Menu } from '../context-menu-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { Timer } from 'src/app/presentation/helpers/timer';
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
})
export class MenuComponent {
  @Input() menu: Menu | undefined;
  @ViewChild('appRoot', { static: false }) appRoot!: ElementRef;

  private cdr = inject(ChangeDetectorRef);
  private elementRef = inject(ElementRef);

  isVisible = false;
  rightPanelStyle: any = {};
  parentRect = new Rectangle();
  private myTimer = new Timer();

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
      position: 'absolute',
      'left.px': clientX,
      'top.px': clientY,
      opacity: 0,
    };
    this.isVisible = true;
    this.myTimer.start(() => {
      this.recalcPosition();
      this.cdr.detectChanges();
    }, 100);
  }

  closeMenu(): void {
    this.myTimer.stop();
    this.isVisible = false;
    this.rightPanelStyle = { display: 'none' };
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

      if (left + width >= viewportWidth) {
        x = -(this.parentRect.width + width) + 4;
      }
    } else {
      if (top + height >= viewportHeight) {
        y = -height + 8;
      }

      if (top + y < 0) {
        y = -top;
      }

      if (left + width >= viewportWidth) {
        x = -width + 8;
      }
    }

    return [x, y];
  }

  private recalcPosition(): void {
    const nativeElement: HTMLElement = this.elementRef.nativeElement;
    const width = nativeElement.children[0].clientWidth + 4;
    const height = nativeElement.children[0].clientHeight + 4;

    // is Menu-Div is visible, ergo if it have width and height
    if (width > 0 && height > 0) {
      this.myTimer.stop();
      const res = this.isElementInViewport();
      this.rightPanelStyle = {
        display: 'block',
        position: 'absolute',
        'left.px': this.parentRect.left + res[0],
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
