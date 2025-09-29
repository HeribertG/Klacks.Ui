/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { Menu } from './context-menu-class';
import { MenuComponent } from './menu/menu.component';
import { ContextMenuService } from './context-menu.service';
import { Timer } from 'src/app/presentation/helpers/timer';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MenuComponent, ClickOutsideDirective],
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  private contextMenuService = inject(ContextMenuService);

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
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  openMenu(event: MouseEvent) {
    this.myTimer.stop();
    this.rightPanelStyle = {
      display: 'contents',
    };

    if (this.main) {
      this.main.openMenu(event.clientX - 4, event.clientY - 4, 0, 0);
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
    }, 1000);
  }

  stopEvent(event: any): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }
}
