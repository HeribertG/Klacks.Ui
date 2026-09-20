// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { Menu, MenuItem } from '../context-menu-class';
import { MenuComponent } from './menu.component';

const VIEWPORT_HEIGHT_PX = 800;
const TALL_MENU_HEIGHT_PX = 2000;
const MENU_WIDTH_PX = 200;
const OPEN_X_PX = 50;
const OPEN_Y_PX = 300;

@Component({
  standalone: true,
  imports: [MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-menu [menu]="menu"></app-menu>`,
})
class HostComponent {
  menu = buildMenu();
}

function buildMenu(): Menu {
  const menu = new Menu();
  const parent = new MenuItem('parent', 'Parent', false);
  parent.hasMenu = true;
  parent.menu = new Menu();
  parent.menu.list.push(new MenuItem('child', 'Child', false));
  menu.list.push(parent, new MenuItem('plain', 'Plain', false));
  return menu;
}

describe('MenuComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const menus = (): MenuComponent[] =>
    fixture.debugElement.queryAll(By.directive(MenuComponent)).map((d) => d.componentInstance as MenuComponent);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('closes the main menu together with every open sub-menu', () => {
    const [main, sub] = menus();
    main.openMenu(OPEN_X_PX, OPEN_Y_PX, 0, 0);
    fixture.nativeElement.querySelector('.menu-item-container').click();
    expect(main.isVisible).toBe(true);
    expect(sub.isVisible).toBe(true);

    main.closeWithSubMenus();

    expect(main.isVisible).toBe(false);
    expect(sub.isVisible).toBe(false);
  });

  it('keeps a sub-menu open when its own parent item is clicked and closes it on a click elsewhere', () => {
    const [main, sub] = menus();
    main.openMenu(OPEN_X_PX, OPEN_Y_PX, 0, 0);
    const parentItem = fixture.nativeElement.querySelector('.menu-item-container') as HTMLElement;

    parentItem.click();
    parentItem.click();
    expect(sub.isVisible).toBe(true);

    document.body.click();
    expect(sub.isVisible).toBe(false);
  });

  it('leaves a closed menu closed when asked to close with sub-menus', () => {
    const [main, sub] = menus();

    main.closeWithSubMenus();

    expect(main.isVisible).toBe(false);
    expect(sub.isVisible).toBe(false);
  });

  it('pins a menu taller than the viewport to the top edge instead of letting it start above it', async () => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT_PX);
    const [main] = menus();
    const container = fixture.nativeElement.querySelector('.menu-container') as HTMLElement;
    Object.defineProperty(container, 'offsetHeight', { value: TALL_MENU_HEIGHT_PX });
    Object.defineProperty(container, 'clientHeight', { value: TALL_MENU_HEIGHT_PX });
    Object.defineProperty(container, 'offsetWidth', { value: MENU_WIDTH_PX });
    Object.defineProperty(container, 'clientWidth', { value: MENU_WIDTH_PX });

    main.openMenu(OPEN_X_PX, OPEN_Y_PX, 0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(main.rightPanelStyle['top.px']).toBe(0);
    expect(main.rightPanelStyle['left.px']).toBe(OPEN_X_PX);
    vi.unstubAllGlobals();
  });

  it('flips a menu that would overflow the bottom edge upwards so it ends at the click position', async () => {
    vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT_PX);
    const [main] = menus();
    const menuHeight = VIEWPORT_HEIGHT_PX - OPEN_Y_PX + 50;
    const container = fixture.nativeElement.querySelector('.menu-container') as HTMLElement;
    Object.defineProperty(container, 'offsetHeight', { value: menuHeight });
    Object.defineProperty(container, 'clientHeight', { value: menuHeight });
    Object.defineProperty(container, 'offsetWidth', { value: MENU_WIDTH_PX });
    Object.defineProperty(container, 'clientWidth', { value: MENU_WIDTH_PX });

    main.openMenu(OPEN_X_PX, OPEN_Y_PX, 0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(main.rightPanelStyle['top.px']).toBeLessThan(OPEN_Y_PX);
    expect(main.rightPanelStyle['top.px']).toBeGreaterThanOrEqual(0);
    vi.unstubAllGlobals();
  });
});
