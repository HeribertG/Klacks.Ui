import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Menu } from './context-menu-class';
import { MenuComponent } from './menu/menu.component';
import { ContextMenuService } from './context-menu.service';
import { Timer } from 'src/app/helpers/timer';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-context-menu',
    templateUrl: './context-menu.component.html',
    styleUrls: ['./context-menu.component.scss'],
    standalone: false
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  @ViewChild('main', { static: true }) main!: MenuComponent;
  @Input() menuData: Menu = new Menu();
  @Output() hasClicked = new EventEmitter<string[]>();
  private myTimer = new Timer();
  private ngUnsubscribe = new Subject<void>();

  constructor(private contextMenuService: ContextMenuService) {}

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
