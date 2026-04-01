import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TooltipComponent } from './tooltip.component';
import { TooltipService } from './tooltip.service';

describe('TooltipComponent', () => {
  let component: TooltipComponent;
  let fixture: ComponentFixture<TooltipComponent>;
  let tooltipService: TooltipService;
  let originalDir: string;

  beforeEach(async () => {
    originalDir = document.documentElement.dir;

    await TestBed.configureTestingModule({
      imports: [TooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TooltipComponent);
    component = fixture.componentInstance;
    tooltipService = TestBed.inject(TooltipService);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.dir = originalDir;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('LTR positioning', () => {
    beforeEach(() => {
      document.documentElement.dir = 'ltr';
    });

    it('should position tooltip to the right of cursor', () => {
      const cursorX = 100;
      const cursorY = 100;
      const offset = 10;

      tooltipService.show({ text: 'Hello', x: cursorX, y: cursorY });

      const style = component.style();
      const leftPx = parseInt(style['left'], 10);

      expect(leftPx).toBe(cursorX + offset);
      expect(style['visibility']).toBe('visible');
    });

    it('should fall back to left side when right edge would go off-screen', () => {
      const viewportWidth = window.innerWidth;
      const cursorX = viewportWidth - 5;
      const cursorY = 100;
      const offset = 10;

      const text = 'A long tooltip text that should overflow';
      const lines = text.split('\n');
      const maxLineLength = Math.max(...lines.map(l => l.length));
      const estimatedWidth = Math.min(maxLineLength * 7 + 20, 400);

      tooltipService.show({ text, x: cursorX, y: cursorY });

      const style = component.style();
      const leftPx = parseInt(style['left'], 10);

      expect(leftPx).toBe(cursorX - estimatedWidth - offset);
    });
  });

  describe('RTL positioning', () => {
    beforeEach(() => {
      document.documentElement.dir = 'rtl';
    });

    it('should position tooltip to the left of cursor', () => {
      const cursorX = 500;
      const cursorY = 100;
      const offset = 10;

      const text = 'Hello';
      const lines = text.split('\n');
      const maxLineLength = Math.max(...lines.map(l => l.length));
      const estimatedWidth = Math.min(maxLineLength * 7 + 20, 400);

      tooltipService.show({ text, x: cursorX, y: cursorY });

      const style = component.style();
      const leftPx = parseInt(style['left'], 10);

      expect(leftPx).toBe(cursorX - estimatedWidth - offset);
      expect(style['visibility']).toBe('visible');
    });

    it('should fall back to right side when left edge would go off-screen', () => {
      const cursorX = 10;
      const cursorY = 100;
      const offset = 10;

      const text = 'A tooltip that would go off the left edge';
      const lines = text.split('\n');
      const maxLineLength = Math.max(...lines.map(l => l.length));
      const estimatedWidth = Math.min(maxLineLength * 7 + 20, 400);

      const wouldBe = cursorX - estimatedWidth - offset;
      expect(wouldBe).toBeLessThan(0);

      tooltipService.show({ text, x: cursorX, y: cursorY });

      const style = component.style();
      const leftPx = parseInt(style['left'], 10);

      expect(leftPx).toBe(cursorX + offset);
    });
  });

  describe('visibility', () => {
    it('should hide tooltip when service emits null', () => {
      tooltipService.show({ text: 'visible', x: 100, y: 100 });
      expect(component.visible()).toBe(true);

      tooltipService.hide();
      expect(component.visible()).toBe(false);
      expect(component.style()['visibility']).toBe('hidden');
    });

    it('should hide tooltip when text is empty', () => {
      tooltipService.show({ text: '', x: 100, y: 100 });
      expect(component.visible()).toBe(false);
    });

    it('should hide tooltip when text is whitespace only', () => {
      tooltipService.show({ text: '   ', x: 100, y: 100 });
      expect(component.visible()).toBe(false);
    });
  });
});
