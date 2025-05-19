import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { MenuItem } from '../context-menu-class';
import { MenuComponent } from '../menu/menu.component';
import { ContextMenuService } from '../context-menu.service';
import { Timer } from 'src/app/helpers/timer';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from 'src/app/directives/click-outside.directive';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    forwardRef(() => MenuComponent),
    ClickOutsideDirective,
  ],
})
export class MenuItemComponent {
  @ViewChild('subMenu', { static: false }) subMenu: MenuComponent | undefined;
  @ViewChild('appRoot', { static: false }) appRoot!: ElementRef;
  @Input() menuItem: MenuItem | undefined;
  @Output() hasClicked = new EventEmitter<string>();

  private myTimer = new Timer();

  constructor(
    private elementRef: ElementRef,
    private contextMenuService: ContextMenuService
  ) {}

  onClick(): void {
    if (this.menuItem?.disabled) {
      return;
    }
    if (this.menuItem?.hasMenu) {
      this.show();
    } else {
      this.contextMenuService.onClickEvent(
        this.menuItem?.key!,
        this.menuItem?.valueKey
      );
    }
  }
  onMouseOver(): void {
    if (this.menuItem?.hasMenu && !this.menuItem?.disabled) {
      this.myTimer.start(() => {
        this.myTimer.stop();
        this.show();
      }, 500);
    }
  }
  onMouseLeave(): void {
    this.myTimer.stop();
    if (this.subMenu) {
      if (this.subMenu.isVisible) {
        this.subMenu.closeMenu();
      }
    }
  }

  onColor(value: string | undefined): string {
    if (value) {
      return value;
    }
    return 'transparent';
  }

  stopEvent(event: any): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }

  private show(): void {
    const nativeElement: HTMLElement = this.elementRef.nativeElement;
    const boundingRect = nativeElement.getBoundingClientRect();
    const width = nativeElement.offsetWidth;
    const height = nativeElement.offsetHeight;
    const offsetTop = nativeElement.offsetTop;
    const parentTop = nativeElement.parentElement?.getBoundingClientRect().top!;
    const top = boundingRect.top;

    if (this.subMenu) {
      if (this.subMenu.isVisible) {
        return;
      }
      this.subMenu.openMenu(
        width + 4,
        parentTop - top + offsetTop,
        width,
        height
      );
    }
  }
}
