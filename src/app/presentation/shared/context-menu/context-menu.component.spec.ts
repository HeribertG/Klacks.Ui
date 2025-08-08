import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ContextMenuComponent } from './context-menu.component';
import { ContextMenuService } from './context-menu.service';
import { MenuComponent } from './menu/menu.component';
import { Menu } from './context-menu-class';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;
  let contextMenuService: jasmine.SpyObj<ContextMenuService>;

  beforeEach(async () => {
    const contextMenuServiceSpy = jasmine.createSpyObj('ContextMenuService', [], {
      hasClicked: new Subject<string[]>()
    });

    await TestBed.configureTestingModule({
      imports: [
        ContextMenuComponent,
        MenuComponent,
        ClickOutsideDirective
      ],
      providers: [
        { provide: ContextMenuService, useValue: contextMenuServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    contextMenuService = TestBed.inject(ContextMenuService) as jasmine.SpyObj<ContextMenuService>;
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
    spyOn(component.hasClicked, 'emit');
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
    component.main = jasmine.createSpyObj('MenuComponent', ['openMenu', 'closeMenu']);

    component.openMenu(mockEvent);

    expect(component.main.openMenu).toHaveBeenCalledWith(96, 196, 0, 0);
  });

  it('should close menu immediately when force is true', () => {
    component.main = jasmine.createSpyObj('MenuComponent', ['openMenu', 'closeMenu']);

    component.closeMenu(true);

    expect(component.main.closeMenu).toHaveBeenCalled();
  });

  it('should set timer to close menu when force is false', (done) => {
    component.main = jasmine.createSpyObj('MenuComponent', ['openMenu', 'closeMenu']);

    component.closeMenu(false);

    // Timer should be set but not immediately called
    expect(component.main.closeMenu).not.toHaveBeenCalled();

    // Wait for timer (less than 1000ms)
    setTimeout(() => {
      expect(component.rightPanelStyle.display).toBe('none');
      done();
    }, 1100);
  });

  it('should prevent default and stop propagation in stopEvent', () => {
    const mockEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      stopPropagation: jasmine.createSpy('stopPropagation'),
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
    spyOn(component['ngUnsubscribe'], 'next');
    spyOn(component['ngUnsubscribe'], 'complete');

    component.ngOnDestroy();

    expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
    expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
  });

  it('should accept menuData input', () => {
    const testMenu = new Menu();
    component.menuData = testMenu;

    expect(component.menuData).toBe(testMenu);
  });
});