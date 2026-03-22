// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a toast via show()', () => {
    const result = service.show('Test message');

    expect(result).not.toBeNull();
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].textOrTpl).toBe('Test message');
  });

  it('should generate unique IDs', () => {
    service.show('First');
    service.show('Second');

    const ids = service.toasts().map(t => t.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('should merge options into toast', () => {
    service.show('Styled toast', {
      classname: 'bg-success text-light',
      delay: 3000,
      autohide: true,
      headertext: 'Success',
    });

    const toast = service.toasts()[0];
    expect(toast.classname).toBe('bg-success text-light');
    expect(toast.delay).toBe(3000);
    expect(toast.autohide).toBe(true);
    expect(toast.headertext).toBe('Success');
  });

  it('should not add toast with empty text', () => {
    const result = service.show('');

    expect(result).toBeNull();
    expect(service.toasts().length).toBe(0);
  });

  it('should not add duplicate toast with same text', () => {
    service.show('Duplicate message');
    const result = service.show('Duplicate message');

    expect(result).toBeNull();
    expect(service.toasts().length).toBe(1);
  });

  it('should remove a toast', () => {
    const toast = service.show('To be removed');
    expect(service.toasts().length).toBe(1);

    service.remove(toast!);
    expect(service.toasts().length).toBe(0);
  });

  it('should handle remove with undefined gracefully', () => {
    service.show('Keep me');
    service.remove(undefined);

    expect(service.toasts().length).toBe(1);
  });

  it('should remove toast by ID', () => {
    const toast = service.show('Remove by ID');
    expect(service.toasts().length).toBe(1);

    service.removeById(toast!.id);
    expect(service.toasts().length).toBe(0);
  });

  it('should find existing toast by text', () => {
    service.show('Find me');

    expect(service.findToast('Find me')).toBe(true);
    expect(service.findToast('Not here')).toBe(false);
  });

  it('should update signal reference when adding toasts', () => {
    const before = service.toasts();
    service.show('New toast');
    const after = service.toasts();

    expect(before).not.toBe(after);
  });

  it('should update signal reference when removing toasts', () => {
    const toast = service.show('Will remove');
    const before = service.toasts();
    service.remove(toast!);
    const after = service.toasts();

    expect(before).not.toBe(after);
  });
});
