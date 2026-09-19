// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TimeRangeService } from './time-range.service';
import { TimeRulerDragDropService } from './time-ruler-drag-drop.service';
import { TimeRulerRenderService } from './time-ruler-render.service';
import { TimeRulerInteractionService } from './time-ruler-interaction.service';

const CANVAS_SIZE = 200;
const INSIDE_POINT = 50;

const createMouseEvent = (type: string, init: MouseEventInit): MouseEvent =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX: INSIDE_POINT, clientY: INSIDE_POINT, ...init });

describe('TimeRulerInteractionService - context click handling', () => {
  let service: TimeRulerInteractionService;
  let dragDrop: { startDrag: any; startBlockDrag: any; cancelDrag: any; dragState: { isDragging: boolean } };
  let blockSelection: any;
  let shiftService: { setSelectedShift: any };
  let canvas: HTMLCanvasElement;
  let item: IContainerTemplateItem;
  let rectangles: Map<IContainerTemplateItem, Rectangle>;
  let shiftRightClick: { emit: any };

  const setPlatform = (platform: string): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  };

  const mouseDown = (init: MouseEventInit): MouseEvent => {
    const event = createMouseEvent('mousedown', init);
    service.handleMouseDown(event, canvas, rectangles, [item], blockSelection);
    return event;
  };

  const contextMenu = (): MouseEvent => {
    const event = createMouseEvent('contextmenu', { button: 2 });
    service.handleContextMenu(event, canvas, rectangles, shiftRightClick as any);
    return event;
  };

  beforeEach(() => {
    dragDrop = {
      startDrag: vi.fn().mockReturnValue(true),
      startBlockDrag: vi.fn().mockReturnValue(true),
      cancelDrag: vi.fn(),
      dragState: { isDragging: false },
    };
    dragDrop.startDrag.mockImplementation(() => {
      dragDrop.dragState.isDragging = true;
      return true;
    });
    dragDrop.cancelDrag.mockImplementation(() => {
      dragDrop.dragState.isDragging = false;
    });
    blockSelection = {
      toggleItem: vi.fn(),
      isSelected: vi.fn().mockReturnValue(false),
      isDraggable: vi.fn().mockReturnValue(false),
      clearSelection: vi.fn(),
    };
    shiftService = { setSelectedShift: vi.fn() };
    shiftRightClick = { emit: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        TimeRulerInteractionService,
        { provide: TimeRulerDragDropService, useValue: dragDrop },
        { provide: ContainerTemplateShiftService, useValue: shiftService },
        { provide: TimeRangeService, useValue: {} },
        { provide: TimeRulerRenderService, useValue: { contentOffsetX: 0 } },
      ],
    });
    service = TestBed.inject(TimeRulerInteractionService);

    canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: CANVAS_SIZE, bottom: CANVAS_SIZE, width: CANVAS_SIZE, height: CANVAS_SIZE, x: 0, y: 0, toJSON: () => ({}),
    });

    item = { shift: { isTimeRange: true } } as unknown as IContainerTemplateItem;
    rectangles = new Map([[item, new Rectangle(0, 0, CANVAS_SIZE, CANVAS_SIZE)]]);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('macOS Ctrl+Click (mousedown button=0, ctrlKey, then contextmenu)', () => {
    beforeEach(() => setPlatform('MacIntel'));

    it('leaves no paint-select or drag state and opens the menu', () => {
      const down = mouseDown({ button: 0, buttons: 1, ctrlKey: true });
      const menu = contextMenu();

      expect(down.defaultPrevented).toBe(false);
      expect(blockSelection.toggleItem).not.toHaveBeenCalled();
      expect(dragDrop.startDrag).not.toHaveBeenCalled();
      expect(service.isPaintSelecting).toBe(false);
      expect(dragDrop.dragState.isDragging).toBe(false);
      expect(shiftRightClick.emit).toHaveBeenCalledTimes(1);
      expect(menu.defaultPrevented).toBe(true);
    });

    it('does not swallow the next regular click afterwards', () => {
      mouseDown({ button: 0, buttons: 1, ctrlKey: true });
      contextMenu();

      service.handleCanvasClick(createMouseEvent('click', { button: 0 }), canvas, rectangles, blockSelection, [item]);

      expect(shiftService.setSelectedShift).toHaveBeenCalledWith(item);
    });

    it('ignores a Ctrl+click event that would otherwise toggle the selection', () => {
      service.handleCanvasClick(
        createMouseEvent('click', { button: 0, ctrlKey: true }), canvas, rectangles, blockSelection, [item]
      );

      expect(blockSelection.toggleItem).not.toHaveBeenCalled();
      expect(blockSelection.clearSelection).not.toHaveBeenCalled();
    });

    it('still starts a drag on a plain primary click', () => {
      mouseDown({ button: 0, buttons: 1 });

      expect(dragDrop.startDrag).toHaveBeenCalledTimes(1);
      expect(dragDrop.dragState.isDragging).toBe(true);
    });
  });

  describe('real secondary button', () => {
    it('ignores mousedown with button=2 and opens the menu via contextmenu', () => {
      setPlatform('Win32');
      mouseDown({ button: 2, buttons: 2 });
      contextMenu();

      expect(blockSelection.toggleItem).not.toHaveBeenCalled();
      expect(dragDrop.startDrag).not.toHaveBeenCalled();
      expect(service.isPaintSelecting).toBe(false);
      expect(shiftRightClick.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('contextmenu resets armed interaction state', () => {
    it('clears paint-select and drag state that were already set', () => {
      setPlatform('Win32');
      mouseDown({ button: 0, buttons: 1, ctrlKey: true });
      expect(service.isPaintSelecting).toBe(true);
      dragDrop.dragState.isDragging = true;

      contextMenu();

      expect(service.isPaintSelecting).toBe(false);
      expect(dragDrop.dragState.isDragging).toBe(false);
    });
  });

  describe('non-Mac Ctrl+Click keeps multi-select semantics', () => {
    it('toggles the item and arms paint-select', () => {
      setPlatform('Win32');
      const down = mouseDown({ button: 0, buttons: 1, ctrlKey: true });

      expect(blockSelection.toggleItem).toHaveBeenCalledTimes(1);
      expect(service.isPaintSelecting).toBe(true);
      expect(down.defaultPrevented).toBe(true);
    });
  });
});
