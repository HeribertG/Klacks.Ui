// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { createSyntheticMouseEvent } from './synthetic-mouse-event.helper';

describe('createSyntheticMouseEvent', () => {
  const source = new PointerEvent('pointermove', {
    pointerType: 'touch',
    clientX: 120,
    clientY: 240,
    screenX: 130,
    screenY: 250,
    ctrlKey: true,
    shiftKey: true,
  });

  it('copies position, modifiers and the requested buttons bitmask', () => {
    const event = createSyntheticMouseEvent('mousemove', source, 1);

    expect(event.type).toBe('mousemove');
    expect(event.clientX).toBe(120);
    expect(event.clientY).toBe(240);
    expect(event.screenX).toBe(130);
    expect(event.screenY).toBe(250);
    expect(event.ctrlKey).toBe(true);
    expect(event.shiftKey).toBe(true);
    expect(event.altKey).toBe(false);
    expect(event.button).toBe(0);
    expect(event.buttons).toBe(1);
  });

  it('bubbles and is cancelable so existing host listeners receive it', () => {
    const event = createSyntheticMouseEvent('mousedown', source, 1);

    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  it('is untrusted, so no browser default action runs for it', () => {
    const event = createSyntheticMouseEvent('mouseup', source, 0);

    expect(event.isTrusted).toBe(false);
    expect(event.buttons).toBe(0);
  });
});
