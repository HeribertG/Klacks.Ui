// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Characterization of the generic canvas scrollbar through its public surface only: real template, real
 * ScrollbarService (thumb metrics) and ScrollAnimationService (rAF loop), a recording 2D context, DOM events on the
 * real canvas and arrow buttons, and the h-/v-scrollbar wrappers the schedule, shift, gantt and availability grids use.
 */
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScrollbarComponent, ScrollbarOrientation } from './scrollbar.component';
import { ScrollbarService } from './scrollbar.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { HScrollbarComponent } from '../h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from '../v-scrollbar/v-scrollbar.component';

interface FakeImage { width: number; height: number; fill: string }
interface PutCall { image: FakeImage; x: number; y: number }
interface FakeContext { fillStyle: string; puts: PutCall[]; clears: number[][] }
interface CanvasBox { offsetWidth: number; offsetHeight: number; offsetLeft: number; offsetTop: number }

const TRACK_COLOR = '#A9A9A9';
const BOX_PROPS: (keyof CanvasBox)[] = ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop'];

let box: CanvasBox;
let contexts: Map<HTMLCanvasElement, FakeContext>;
let rafQueue: Map<number, FrameRequestCallback>;
let rafId: number;
let originalRaf: typeof window.requestAnimationFrame;
let originalCaf: typeof window.cancelAnimationFrame;

function createFakeContext(): FakeContext & Record<string, unknown> {
  const noop = (): void => undefined;
  const ctx: FakeContext & Record<string, unknown> = {
    fillStyle: '',
    puts: [],
    clears: [],
    beginPath: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop, closePath: noop, fill: noop,
    save: noop, restore: noop,
    getImageData: (_x: number, _y: number, width: number, height: number): FakeImage =>
      ({ width, height, fill: ctx.fillStyle }),
    putImageData: (image: FakeImage, x: number, y: number): void => { ctx.puts.push({ image, x, y }); },
    clearRect: (_x: number, _y: number, width: number, height: number): void => { ctx.clears.push([width, height]); },
  };
  return ctx;
}

function installDomFakes(): void {
  contexts = new Map();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const ctx = createFakeContext();
    contexts.set(this, ctx);
    return ctx as unknown as CanvasRenderingContext2D;
  } as never);
  for (const prop of BOX_PROPS) {
    Object.defineProperty(HTMLCanvasElement.prototype, prop, { configurable: true, get: () => box[prop] });
  }
  rafQueue = new Map();
  rafId = 0;
  originalRaf = window.requestAnimationFrame;
  originalCaf = window.cancelAnimationFrame;
  window.requestAnimationFrame = (cb: FrameRequestCallback): number => { rafQueue.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id: number): void => { rafQueue.delete(id); };
  vi.stubGlobal('ResizeObserver', class {
    observe(): void { /* not needed */ }
    unobserve(): void { /* not needed */ }
    disconnect(): void { /* not needed */ }
  });
}

function removeDomFakes(): void {
  for (const prop of BOX_PROPS) {
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)[prop];
  }
  window.requestAnimationFrame = originalRaf;
  window.cancelAnimationFrame = originalCaf;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

function flushFrames(max = 1000): number {
  let count = 0;
  while (rafQueue.size > 0 && count < max) {
    const [id, cb] = rafQueue.entries().next().value as [number, FrameRequestCallback];
    rafQueue.delete(id);
    cb(0);
    count++;
  }
  return count;
}

function pairs(from: number, to: number, step: number): string[] {
  const out: string[] = [];
  for (let v = from; step > 0 ? v <= to : v >= to; v += step) {
    out.push(`value:${v}`, `value:${v}`);
  }
  return out;
}

@Component({
  template: `<app-scrollbar
    [orientation]="orientation"
    [value]="value()"
    [maxValue]="maxValue()"
    [visibleValue]="visibleValue()"
    (valueChange)="log.push('value:' + $event)"
    (maxValueChange)="log.push('max:' + $event)"
  ></app-scrollbar>`,
  imports: [ScrollbarComponent],
})
class ScrollbarTestHostComponent {
  orientation: ScrollbarOrientation = 'horizontal';
  readonly value = signal(0);
  readonly maxValue = signal(100);
  readonly visibleValue = signal(20);
  readonly log: string[] = [];
  readonly scrollbar = viewChild.required(ScrollbarComponent);
}

@Component({
  template: `<app-h-scrollbar [value]="value" [maxValue]="100" [visibleValue]="20"
      (valueChange)="log.push('h:' + $event)" (maxValueChange)="log.push('hmax:' + $event)"></app-h-scrollbar>
    <app-v-scrollbar [value]="value" [maxValue]="100" [visibleValue]="20"
      (valueChange)="log.push('v:' + $event)" (maxValueChange)="log.push('vmax:' + $event)"></app-v-scrollbar>`,
  imports: [HScrollbarComponent, VScrollbarComponent],
})
class WrapperTestHostComponent {
  value = 0;
  maxValue = 100;
  readonly log: string[] = [];
  readonly h = viewChild.required(HScrollbarComponent);
  readonly v = viewChild.required(VScrollbarComponent);
}

async function configure(): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [ScrollbarTestHostComponent, WrapperTestHostComponent],
    providers: [
      ScrollbarService,
      { provide: GridColorService, useValue: { scrollTrack: TRACK_COLOR, controlBackGroundColor: '#D5DBDB' } },
    ],
  }).compileComponents();
}

describe('ScrollbarComponent characterization', () => {
  let fixture: ComponentFixture<ScrollbarTestHostComponent>;
  let host: ScrollbarTestHostComponent;
  let originalDir: string;

  const canvas = (): HTMLCanvasElement => fixture.nativeElement.querySelector('app-scrollbar canvas');
  const scrollbarEl = (): HTMLElement => fixture.nativeElement.querySelector('app-scrollbar');
  const arrows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.arrow-thumb'));
  const ctx = (): FakeContext => contexts.get(canvas())!;
  const lastPut = (): PutCall => ctx().puts[ctx().puts.length - 1];
  const darkColor = (): string => TestBed.inject(ScrollbarService).scrollTrackColorDark;
  const svg = (key: 'triangleTopSvg' | 'triangleBottomSvg' | 'triangleLeftSvg' | 'triangleRightSvg'): string => {
    const probe = document.createElement('div');
    probe.innerHTML = TestBed.inject(ScrollbarService)[key];
    return probe.innerHTML;
  };

  const mouse = (type: string, init: MouseEventInit): void => {
    canvas().dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }));
  };
  const pointer = (type: string, init: PointerEventInit): void => {
    canvas().dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, ...init }));
  };

  function mount(orientation: ScrollbarOrientation, setup?: (h: ScrollbarTestHostComponent) => void): void {
    fixture = TestBed.createComponent(ScrollbarTestHostComponent);
    host = fixture.componentInstance;
    host.orientation = orientation;
    setup?.(host);
    const c = canvas();
    c.setPointerCapture = vi.fn();
    c.hasPointerCapture = vi.fn().mockReturnValue(true);
    c.releasePointerCapture = vi.fn();
    Object.defineProperty(scrollbarEl(), 'offsetWidth', { configurable: true, value: 550 });
    Object.defineProperty(scrollbarEl(), 'offsetHeight', { configurable: true, value: 16 });
    fixture.detectChanges();
  }

  function setInputs(changes: { value?: number; maxValue?: number; visibleValue?: number }): void {
    if (changes.value !== undefined) host.value.set(changes.value);
    if (changes.maxValue !== undefined) host.maxValue.set(changes.maxValue);
    if (changes.visibleValue !== undefined) host.visibleValue.set(changes.visibleValue);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    originalDir = document.documentElement.dir;
    document.documentElement.dir = 'ltr';
    box = { offsetWidth: 500, offsetHeight: 16, offsetLeft: 0, offsetTop: 0 };
    installDomFakes();
    await configure();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    removeDomFakes();
    document.documentElement.dir = originalDir;
  });

  describe('horizontal LTR rendering', () => {
    beforeEach(() => mount('horizontal'));

    it('sizes the canvas from its offset box and draws the real thumb (100 x 10) at x=0, centred cross-axis', () => {
      expect(canvas().width).toBe(500);
      expect(canvas().height).toBe(16);
      expect(lastPut()).toEqual({ image: { width: 100, height: 10, fill: TRACK_COLOR }, x: 0, y: 4 });
      expect(ctx().clears.at(-1)).toEqual([500, 16]);
    });

    it('does not emit maxValueChange or clamp on the very first binding (ngOnChanges runs before the canvas context)', () => {
      expect(host.log).toEqual([]);
    });

    it('moves the thumb proportionally to value / (max - visible + 5) of the free track', () => {
      setInputs({ value: 10 });
      expect(host.log).toEqual(['value:10']);
      expect(lastPut().x).toBe(47);

      setInputs({ value: 85 });
      expect(lastPut().x).toBe(400);
    });

    it('clamps a bound value to max - visible + 5 and emits the clamped value', () => {
      setInputs({ value: 200 });
      expect(host.log).toEqual(['value:85']);
      expect(host.scrollbar().value).toBe(85);
      expect(lastPut().x).toBe(400);

      setInputs({ value: -3 });
      expect(host.scrollbar().value).toBe(0);
      expect(host.log).toEqual(['value:85', 'value:0']);
    });

    it('shrinking maxValue below the value clamps first, then emits maxValueChange, then redraws with new metrics', () => {
      setInputs({ value: 80 });
      host.log.length = 0;

      setInputs({ maxValue: 50 });

      expect(host.log).toEqual(['value:35', 'max:50']);
      expect(lastPut()).toEqual({ image: { width: 200, height: 10, fill: TRACK_COLOR }, x: 300, y: 4 });
    });

    it('a visibleValue-only change re-clamps and re-measures but emits no maxValueChange', () => {
      setInputs({ value: 80 });
      host.log.length = 0;

      setInputs({ visibleValue: 90 });

      expect(host.log).toEqual(['value:15']);
      expect(lastPut().image.width).toBe(450);
    });

    it('the imperative path used by schedule-section (value setter + refresh) emits and redraws', () => {
      const scrollbar = host.scrollbar();
      scrollbar.value = 30;
      scrollbar.refresh();

      expect(host.log).toEqual(['value:30']);
      expect(lastPut().x).toBe(141);
    });

    it('disables the backward arrow at 0 and the forward arrow from max - visible (5 ticks before the drag limit)', () => {
      expect(arrows()[0].classList.contains('disabled')).toBe(true);
      expect(arrows()[0].getAttribute('aria-disabled')).toBe('true');
      expect(arrows()[1].classList.contains('disabled')).toBe(false);
      expect(arrows()[1].getAttribute('disabled')).toBeNull();

      setInputs({ value: 79 });
      expect(arrows()[0].classList.contains('disabled')).toBe(false);
      expect(arrows()[1].classList.contains('disabled')).toBe(false);

      setInputs({ value: 80 });
      expect(arrows()[1].classList.contains('disabled')).toBe(true);
      expect(arrows()[1].getAttribute('disabled')).toBe('true');
    });

    it('shows the arrows while the host has a size', () => {
      expect(arrows().every((a) => !a.classList.contains('hidden'))).toBe(true);
    });

    it('renders the left/right triangle svgs on the arrows', () => {
      expect(arrows()[0].innerHTML).toBe(svg('triangleLeftSvg'));
      expect(arrows()[1].innerHTML).toBe(svg('triangleRightSvg'));
    });

    it('hit-tests the thumb by ticks of the metric tick size (public isMouseOverThumb)', () => {
      const scrollbar = host.scrollbar();
      expect(scrollbar.isMouseOverThumb({ clientX: 0 } as MouseEvent)).toBe(true);
      expect(scrollbar.isMouseOverThumb({ clientX: 100 } as MouseEvent)).toBe(true);
      expect(scrollbar.isMouseOverThumb({ clientX: 103 } as MouseEvent)).toBe(false);
      setInputs({ value: 10 });
      expect(scrollbar.isMouseOverThumb({ clientX: 47 } as MouseEvent)).toBe(false);
      expect(scrollbar.isMouseOverThumb({ clientX: 48 } as MouseEvent)).toBe(true);
    });
  });

  describe('horizontal LTR pointer interaction', () => {
    beforeEach(() => mount('horizontal'));

    it('hovering the thumb draws the dark thumb image; the throttle drops a second move within 16 ms', () => {
      mouse('mousemove', { clientX: 50 });
      expect(lastPut().image.fill).toBe(darkColor());

      mouse('mousemove', { clientX: 300 });
      expect(lastPut().image.fill).toBe(darkColor());

      vi.advanceTimersByTime(20);
      mouse('mousemove', { clientX: 300 });
      expect(lastPut().image.fill).toBe(TRACK_COLOR);
    });

    it('mouseleave resets the hover image', () => {
      mouse('mousemove', { clientX: 50 });
      mouse('mouseleave', {});
      expect(lastPut().image.fill).toBe(TRACK_COLOR);
    });

    it('drags the thumb by pointer: offset from grab point, value = pos / tickSize, clamped to invisible ticks + 5', () => {
      pointer('pointerdown', { clientX: 50, button: 0, buttons: 1 });
      expect(canvas().setPointerCapture).toHaveBeenCalledWith(7);

      pointer('pointermove', { clientX: 150 });
      expect(host.log).toEqual(['value:20']);
      expect(lastPut().x).toBe(94);

      pointer('pointermove', { clientX: 1000 });
      expect(host.log).toEqual(['value:20', 'value:85']);

      pointer('pointerup', { clientX: 1000 });
      expect(canvas().releasePointerCapture).toHaveBeenCalledWith(7);
      pointer('pointermove', { clientX: 150 });
      expect(host.log).toEqual(['value:20', 'value:85']);
    });

    it('does not start a drag when the pointer is down outside the thumb', () => {
      pointer('pointerdown', { clientX: 300, button: 0, buttons: 1 });
      pointer('pointermove', { clientX: 400 });
      expect(host.log).toEqual([]);
      expect(canvas().setPointerCapture).not.toHaveBeenCalled();
    });

    it('a pointerdown on the thumb without buttons=1 still drags, but without grab offset and capture', () => {
      pointer('pointerdown', { clientX: 50, button: 0, buttons: 0 });
      pointer('pointermove', { clientX: 150 });
      expect(host.log).toEqual(['value:30']);
      expect(canvas().setPointerCapture).not.toHaveBeenCalled();
    });

    it('ignores a pointerdown with the secondary button on the thumb', () => {
      pointer('pointerdown', { clientX: 50, button: 2, buttons: 2 });
      pointer('pointermove', { clientX: 150 });
      expect(host.log).toEqual([]);
    });

    it('drag clamps by the thumb image ticks from the last refresh, not by the current inputs (setter clamps by inputs)', () => {
      const scrollbar = host.scrollbar();
      scrollbar.maxValue = 50;
      pointer('pointerdown', { clientX: 50, button: 0, buttons: 1 });
      pointer('pointermove', { clientX: 1000 });
      expect(scrollbar.value).toBe(85);

      scrollbar.value = 200;
      expect(scrollbar.value).toBe(35);
    });

    it('a primary click on the track after the thumb animates forward in steps of 3 (each step emitted twice) until the thumb reaches the pointer', () => {
      mouse('mousedown', { clientX: 400 });
      flushFrames();

      expect(host.log).toEqual(pairs(3, 60, 3));
      expect(rafQueue.size).toBe(0);
    });

    it('a click on the track before the thumb animates backward to 0', () => {
      setInputs({ value: 60 });
      host.log.length = 0;

      mouse('mousedown', { clientX: 10 });
      flushFrames();

      expect(host.log).toEqual(pairs(57, 0, -3));
    });

    it('mouseup stops a running track animation', () => {
      mouse('mousedown', { clientX: 400 });
      flushFrames(16);
      const before = [...host.log];
      mouse('mouseup', {});
      flushFrames();
      expect(host.log).toEqual(before);
      expect(before).toEqual(pairs(3, 6, 3));
    });

    it('moving onto the thumb stops a running track animation', () => {
      mouse('mousedown', { clientX: 400 });
      flushFrames(16);
      mouse('mousemove', { clientX: 60 });
      const before = [...host.log];
      flushFrames();
      expect(host.log).toEqual(before);
      expect(before).toEqual(pairs(3, 6, 3));
    });

    it('ignores the secondary button and a Mac Ctrl+Click on the track', () => {
      mouse('mousedown', { clientX: 400, button: 2 });
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
      mouse('mousedown', { clientX: 400, ctrlKey: true });
      flushFrames();
      expect(host.log).toEqual([]);
    });

    it('an arrow press steps by 1 at once, holds into an accelerating 1-step animation after 300 ms, and stops on release', () => {
      const forward = arrows()[1];
      const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, buttons: 1 });
      forward.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      expect(host.log).toEqual(['value:1']);

      vi.advanceTimersByTime(299);
      expect(rafQueue.size).toBe(0);
      vi.advanceTimersByTime(1);
      flushFrames(25);
      expect(host.log).toEqual(['value:1', ...pairs(2, 10, 1)]);

      const up = new PointerEvent('pointerup', { bubbles: true, cancelable: true });
      forward.dispatchEvent(up);
      expect(up.defaultPrevented).toBe(true);
      flushFrames();
      expect(host.scrollbar().value).toBe(10);
    });

    it('releasing an arrow before 300 ms never starts the hold animation; pointerleave also ends it', () => {
      const backward = arrows()[0];
      setInputs({ value: 40 });
      host.log.length = 0;
      backward.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }));
      backward.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      vi.advanceTimersByTime(1000);
      flushFrames();
      expect(host.log).toEqual(['value:39']);
    });

    it('re-measures on ResizeObserver entries (width minus 50 px padding, height from the offset box)', () => {
      host.scrollbar().onResize([{ contentRect: { width: 350, height: 99 } } as ResizeObserverEntry]);
      expect(canvas().width).toBe(300);
      expect(canvas().height).toBe(16);
      expect(lastPut().image).toEqual({ width: 60, height: 10, fill: TRACK_COLOR });

      const puts = ctx().puts.length;
      host.scrollbar().onResize({ notAnArray: true });
      expect(ctx().puts.length).toBe(puts);
    });

    it('re-measures 150 ms after the last window resize from the canvas offset width', () => {
      box.offsetWidth = 300;
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(149);
      expect(canvas().width).toBe(500);
      vi.advanceTimersByTime(1);
      expect(canvas().width).toBe(300);
      expect(lastPut().image.width).toBe(60);
    });

    it('stops reacting to canvas events and pending frames after destroy', () => {
      mouse('mousedown', { clientX: 400 });
      const c = canvas();
      fixture.destroy();
      flushFrames();
      c.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, button: 0, buttons: 1 }));
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: 150 }));
      expect(host.log).toEqual([]);
    });
  });

  describe('initial binding order', () => {
    it('clamps a large initial value against the default 365/180 range because value is bound before maxValue', () => {
      mount('horizontal', (h) => { h.value.set(300); h.maxValue.set(400); h.visibleValue.set(50); });
      expect(host.log).toEqual(['value:190']);
      expect(host.scrollbar().value).toBe(190);
    });
  });

  describe('vertical', () => {
    beforeEach(() => {
      box = { offsetWidth: 16, offsetHeight: 500, offsetLeft: 0, offsetTop: 30 };
      mount('vertical');
    });

    it('draws a 10 x 100 thumb at x=4 on the main y axis', () => {
      expect(lastPut()).toEqual({ image: { width: 10, height: 100, fill: TRACK_COLOR }, x: 4, y: 0 });
      setInputs({ value: 10 });
      expect(lastPut()).toEqual({ image: { width: 10, height: 100, fill: TRACK_COLOR }, x: 4, y: 47 });
    });

    it('renders the top/bottom triangle svgs', () => {
      expect(arrows()[0].innerHTML).toBe(svg('triangleTopSvg'));
      expect(arrows()[1].innerHTML).toBe(svg('triangleBottomSvg'));
    });

    it('hit-tests and drags along clientY relative to the canvas offsetTop', () => {
      expect(host.scrollbar().isMouseOverThumb({ clientY: 80 } as MouseEvent)).toBe(true);
      expect(host.scrollbar().isMouseOverThumb({ clientY: 25 } as MouseEvent)).toBe(false);

      pointer('pointerdown', { clientY: 80, button: 0, buttons: 1 });
      pointer('pointermove', { clientY: 180 });
      expect(host.log).toEqual(['value:20']);
    });

    it('animates a track click forward until the thumb reaches the pointer (offset-corrected)', () => {
      mouse('mousedown', { clientY: 430 });
      flushFrames();
      expect(host.log).toEqual(pairs(3, 60, 3));
    });

    it('re-measures on ResizeObserver entries (height minus 50 px padding)', () => {
      host.scrollbar().onResize([{ contentRect: { width: 16, height: 350 } } as ResizeObserverEntry]);
      expect(canvas().width).toBe(16);
      expect(canvas().height).toBe(300);
      expect(lastPut().image).toEqual({ width: 10, height: 60, fill: TRACK_COLOR });
    });
  });

  describe('horizontal RTL', () => {
    beforeEach(() => {
      document.documentElement.dir = 'rtl';
      mount('horizontal');
    });

    it('mirrors the thumb: value 0 at the right end, max at the left, proportional in between', () => {
      expect(lastPut().x).toBe(400);
      setInputs({ value: 10 });
      expect(lastPut().x).toBe(353);
      setInputs({ value: 85 });
      expect(lastPut().x).toBe(0);
    });

    it('swaps the arrow svgs', () => {
      expect(arrows()[0].innerHTML).toBe(svg('triangleRightSvg'));
      expect(arrows()[1].innerHTML).toBe(svg('triangleLeftSvg'));
    });

    it('hit-tests on the mirrored pointer position', () => {
      expect(host.scrollbar().isMouseOverThumb({ clientX: 450 } as MouseEvent)).toBe(true);
      expect(host.scrollbar().isMouseOverThumb({ clientX: 50 } as MouseEvent)).toBe(false);
    });

    it('drags with the mirrored proportional mapping', () => {
      pointer('pointerdown', { clientX: 450, button: 0, buttons: 1 });
      pointer('pointermove', { clientX: 350 });
      expect(host.log).toEqual(['value:21']);
      pointer('pointermove', { clientX: -500 });
      expect(host.log).toEqual(['value:21', 'value:85']);
    });

    it('a track click left of the thumb animates forward (value grows), bounded by the mirrored pointer', () => {
      mouse('mousedown', { clientX: 100 });
      flushFrames();
      expect(host.log).toEqual(pairs(3, 60, 3));
    });

    it('a track click right of the thumb animates backward', () => {
      setInputs({ value: 60 });
      host.log.length = 0;
      mouse('mousedown', { clientX: 490 });
      flushFrames();
      expect(host.log).toEqual(pairs(57, 0, -3));
    });
  });

  describe('hidden host', () => {
    it('hides the arrow buttons while the host has no size', () => {
      fixture = TestBed.createComponent(ScrollbarTestHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      expect(arrows().every((a) => a.classList.contains('hidden'))).toBe(true);
    });
  });
});

describe('h-/v-scrollbar wrappers over ScrollbarComponent (characterization)', () => {
  let fixture: ComponentFixture<WrapperTestHostComponent>;

  beforeEach(async () => {
    document.documentElement.dir = 'ltr';
    box = { offsetWidth: 500, offsetHeight: 500, offsetLeft: 0, offsetTop: 0 };
    installDomFakes();
    await configure();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    fixture = TestBed.createComponent(WrapperTestHostComponent);
    fixture.nativeElement.querySelectorAll('canvas').forEach((c: HTMLCanvasElement) => {
      c.setPointerCapture = vi.fn();
      c.hasPointerCapture = vi.fn().mockReturnValue(false);
      c.releasePointerCapture = vi.fn();
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    removeDomFakes();
  });

  it('relays drags of the inner scrollbar through the wrapper outputs and keeps the wrapper value in step', () => {
    const [hCanvas, vCanvas] = Array.from(fixture.nativeElement.querySelectorAll('canvas')) as HTMLCanvasElement[];

    hCanvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, button: 0, buttons: 1, pointerId: 1 }));
    hCanvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 60 }));
    vCanvas.dispatchEvent(new PointerEvent('pointerdown', { clientY: 10, button: 0, buttons: 1, pointerId: 2 }));
    vCanvas.dispatchEvent(new PointerEvent('pointermove', { clientY: 110 }));

    expect(fixture.componentInstance.log).toEqual(['h:10', 'v:20']);
    expect(fixture.componentInstance.h().value).toBe(10);
    expect(fixture.componentInstance.v().value).toBe(20);
  });

  it('wrapper refresh() re-measures the inner canvas', () => {
    const hCanvas = fixture.nativeElement.querySelector('app-h-scrollbar canvas') as HTMLCanvasElement;
    hCanvas.width = 300;
    fixture.componentInstance.h().refresh();
    const puts = contexts.get(hCanvas)!.puts;
    expect(puts[puts.length - 1].image.width).toBe(60);
  });
});
