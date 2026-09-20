// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Menu } from './context-menu-class';
import { MenuComponent } from './menu/menu.component';
import { ContextMenuService } from './context-menu.service';
import { Timer } from 'src/app/presentation/helpers/timer';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import {
  TOUCH_LIKE_POINTER_TYPES,
  TouchInteraction,
} from 'src/app/domain/constants/touch-interaction.constants';

const MOUSE_OPEN_OFFSET_PX = 4;
const CONTEXT_MENU_TOUCH_CLASS = 'context-menu--touch';
const DELAYED_CLOSE_MS = 1000;

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MenuComponent, ClickOutsideDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  private contextMenuService = inject(ContextMenuService);
  private cdr = inject(ChangeDetectorRef);
  private hostElementRef = inject(ElementRef);
  protected readonly inputModality = inject(InputModalityService);
  private movedToBody = false;

  @ViewChild('main', { static: false }) main!: MenuComponent;
  @Input() menuData: Menu = new Menu();
  @Output() hasClicked = new EventEmitter<string[]>();
  private myTimer = new Timer();
  private ngUnsubscribe = new Subject<void>();

  rightPanelStyle: any = {};

  ngOnInit(): void {
    this.contextMenuService.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.hasClicked.emit(x);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    const host = this.hostElementRef.nativeElement as HTMLElement;
    if (this.movedToBody && host.parentNode === document.body) {
      document.body.removeChild(host);
    }
  }

  openMenu(event: MouseEvent) {
    this.myTimer.stop();
    const host = this.hostElementRef.nativeElement as HTMLElement;
    if (!this.movedToBody) {
      document.body.appendChild(host);
      this.movedToBody = true;
    }
    const touch = this.isTouchOpen(event);
    host.classList.toggle(CONTEXT_MENU_TOUCH_CLASS, touch);
    this.rightPanelStyle = {
      display: 'contents',
    };
    this.cdr.detectChanges();

    if (this.main) {
      if (this.main.isVisible) {
        this.main.closeWithSubMenus();
      }
      const isRtl = document.documentElement.dir === 'rtl';
      const offset = touch ? TouchInteraction.MenuOffsetFromFingerPx : MOUSE_OPEN_OFFSET_PX;
      const towardsInlineEnd = touch ? offset : -offset;
      const openX = isRtl ? event.clientX - towardsInlineEnd : event.clientX + towardsInlineEnd;
      this.main.openMenu(openX, event.clientY - offset, 0, 0);
      this.contextMenuService.markOpened(touch);
    }
  }
  closeMenu(force = false) {
    if (force) {
      this.main.closeMenu();
      return;
    }

    this.myTimer.start(() => {
      this.rightPanelStyle = { display: 'none' };
      if (this.main) {
        this.main.closeMenu();
      }
      this.cdr.markForCheck();
    }, DELAYED_CLOSE_MS);
  }

  private isTouchOpen(event: MouseEvent): boolean {
    const pointerType = (event as PointerEvent).pointerType;
    if (pointerType) {
      return TOUCH_LIKE_POINTER_TYPES.has(pointerType);
    }
    return this.inputModality.isTouchMode();
  }

  stopEvent(event: any): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }
}
