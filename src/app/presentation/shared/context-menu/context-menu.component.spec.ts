// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ContextMenuComponent } from './context-menu.component';
import { ContextMenuService } from './context-menu.service';
import { MenuComponent } from './menu/menu.component';
import { Menu } from './context-menu-class';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

describe('ContextMenuComponent', () => {
    let component: ContextMenuComponent;
    let fixture: ComponentFixture<ContextMenuComponent>;
    let contextMenuService: any;
    let touchMode: boolean;

    beforeEach(async () => {
        touchMode = false;
        const contextMenuServiceSpy = {
            hasClicked: new Subject<string[]>(),
            markOpened: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [
                ContextMenuComponent,
                MenuComponent,
                ClickOutsideDirective
            ],
            providers: [
                { provide: ContextMenuService, useValue: contextMenuServiceSpy },
                { provide: InputModalityService, useValue: { isTouchMode: () => touchMode } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ContextMenuComponent);
        component = fixture.componentInstance;
        contextMenuService = TestBed.inject(ContextMenuService) as any;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default menuData', () => {
        expect(component.menuData).toBeInstanceOf(Menu);
    });

    it('should initialize with default rightPanelStyle', () => {
        expect(component.rightPanelStyle).toEqual({});
    });

    it('should emit hasClicked when service emits', () => {
        vi.spyOn(component.hasClicked, 'emit');
        const testData = ['test', 'data'];

        component.ngOnInit();
        contextMenuService.hasClicked.next(testData);

        expect(component.hasClicked.emit).toHaveBeenCalledWith(testData);
    });

    it('should set rightPanelStyle to contents when openMenu is called', () => {
        const mockEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 200
        });

        component.openMenu(mockEvent);

        expect(component.rightPanelStyle).toEqual({
            display: 'contents'
        });
    });

    it('should call main.openMenu with correct coordinates when openMenu is called', () => {
        const mockEvent = new MouseEvent('contextmenu', {
            clientX: 100,
            clientY: 200
        });

        // Mock the ViewChild component
        const mockMain = {
            openMenu: vi.fn(),
            closeMenu: vi.fn()
        } as any;
        component.main = mockMain;
        vi.spyOn(component['cdr'], 'detectChanges').mockImplementation(() => {});

        component.openMenu(mockEvent);

        expect(mockMain.openMenu).toHaveBeenCalledWith(96, 196, 0, 0);
    });

    it('should close menu immediately when force is true', () => {
        component.main = {
            openMenu: vi.fn(),
            closeMenu: vi.fn()
        } as any;

        component.closeMenu(true);

        expect(component.main.closeMenu).toHaveBeenCalled();
    });

    it('should set timer to close menu when force is false', async () => {
        component.main = {
            openMenu: vi.fn(),
            closeMenu: vi.fn()
        } as any;

        component.closeMenu(false);

        // Timer should be set but not immediately called
        expect(component.main.closeMenu).not.toHaveBeenCalled();

        // Wait for timer (less than 1000ms)
        await new Promise(resolve => setTimeout(resolve, 1100));
        expect(component.rightPanelStyle.display).toBe('none');
    });

    it('should prevent default and stop propagation in stopEvent', () => {
        const mockEvent = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            cancelBubble: false
        };

        component.stopEvent(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(mockEvent.cancelBubble).toBe(false);
    });

    it('should handle stopEvent when methods are undefined', () => {
        const mockEvent = {};

        // Should not throw error
        expect(() => component.stopEvent(mockEvent)).not.toThrow();
    });

    it('should render context menu div with correct attributes', () => {
        fixture.detectChanges();

        const contextMenuDiv = fixture.nativeElement.querySelector('#context-menu');
        expect(contextMenuDiv).toBeTruthy();
        expect(contextMenuDiv.classList.contains('context-menu')).toBe(true);
    });

    it('should render app-menu component', () => {
        fixture.detectChanges();

        const menuComponent = fixture.nativeElement.querySelector('app-menu');
        expect(menuComponent).toBeTruthy();
    });

    it('should properly clean up subscriptions on destroy', () => {
        vi.spyOn(component['ngUnsubscribe'], 'next');
        vi.spyOn(component['ngUnsubscribe'], 'complete');

        component.ngOnDestroy();

        expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
        expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
    });

    it('should accept menuData input', () => {
        const testMenu = new Menu();
        component.menuData = testMenu;

        expect(component.menuData).toBe(testMenu);
    });

    describe('touch mode', () => {
        const hostOf = (): HTMLElement => (component as any).hostElementRef.nativeElement as HTMLElement;

        const mockMain = (): any => {
            const main = { openMenu: vi.fn(), closeMenu: vi.fn(), closeWithSubMenus: vi.fn(), isVisible: false } as any;
            component.main = main;
            vi.spyOn(component['cdr'], 'detectChanges').mockImplementation(() => {});
            return main;
        };

        const fingerOffset = TouchInteraction.MenuOffsetFromFingerPx;

        afterEach(() => {
            document.documentElement.dir = '';
        });

        it('opens with a finger offset, the touch class and an armed ghost-click guard for a touch pointer', () => {
            const main = mockMain();

            component.openMenu(new PointerEvent('contextmenu', { clientX: 200, clientY: 300, pointerType: 'touch' }));

            expect(main.openMenu).toHaveBeenCalledWith(200 + fingerOffset, 300 - fingerOffset, 0, 0);
            expect(hostOf().classList.contains('context-menu--touch')).toBe(true);
            expect(contextMenuService.markOpened).toHaveBeenCalledWith(true);
        });

        it('keeps the mouse offset, drops the touch class and arms no guard for a mouse pointer', () => {
            const main = mockMain();
            hostOf().classList.add('context-menu--touch');

            component.openMenu(new PointerEvent('contextmenu', { clientX: 200, clientY: 300, pointerType: 'mouse' }));

            expect(main.openMenu).toHaveBeenCalledWith(196, 296, 0, 0);
            expect(hostOf().classList.contains('context-menu--touch')).toBe(false);
            expect(contextMenuService.markOpened).toHaveBeenCalledWith(false);
        });

        it('treats a pen like a finger for the menu geometry', () => {
            const main = mockMain();

            component.openMenu(new PointerEvent('contextmenu', { clientX: 200, clientY: 300, pointerType: 'pen' }));

            expect(main.openMenu).toHaveBeenCalledWith(200 + fingerOffset, 300 - fingerOffset, 0, 0);
        });

        it('falls back to the input modality when the opener passes a bare coordinate object', () => {
            const main = mockMain();
            touchMode = true;

            component.openMenu({ clientX: 200, clientY: 300 } as MouseEvent);

            expect(main.openMenu).toHaveBeenCalledWith(200 + fingerOffset, 300 - fingerOffset, 0, 0);
        });

        it('mirrors the offsets in a right-to-left document without changing the mouse behaviour', () => {
            const main = mockMain();
            document.documentElement.dir = 'rtl';

            component.openMenu(new PointerEvent('contextmenu', { clientX: 200, clientY: 300, pointerType: 'mouse' }));
            expect(main.openMenu).toHaveBeenLastCalledWith(204, 296, 0, 0);

            component.openMenu(new PointerEvent('contextmenu', { clientX: 200, clientY: 300, pointerType: 'touch' }));
            expect(main.openMenu).toHaveBeenLastCalledWith(200 - fingerOffset, 300 - fingerOffset, 0, 0);
        });

        it('closes a menu that is still open before it opens at the new position', () => {
            const main = mockMain();
            main.isVisible = true;

            component.openMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }));

            expect(main.closeWithSubMenus).toHaveBeenCalledTimes(1);
            expect(main.closeWithSubMenus.mock.invocationCallOrder[0]).toBeLessThan(main.openMenu.mock.invocationCallOrder[0]);
        });

        it('does not close anything when no menu is open', () => {
            const main = mockMain();

            component.openMenu(new MouseEvent('contextmenu', { clientX: 10, clientY: 20 }));

            expect(main.closeWithSubMenus).not.toHaveBeenCalled();
        });

        it('closes immediately on an outside click in touch mode instead of after the delay', () => {
            touchMode = true;
            fixture.detectChanges();
            const closeSpy = vi.spyOn(component, 'closeMenu').mockImplementation(() => {});

            document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(closeSpy).toHaveBeenCalledWith(true);
        });

        it('keeps the delayed close on an outside click with a mouse', () => {
            touchMode = false;
            fixture.detectChanges();
            const closeSpy = vi.spyOn(component, 'closeMenu').mockImplementation(() => {});

            document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

            expect(closeSpy).toHaveBeenCalledWith(false);
        });
    });
});
