// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { TranscriptOverlayComponent } from './transcript-overlay.component';
import type { ChatMessage } from '../../assistant-chat/chat-message.interface';

function makeMessages(n: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    sender: i % 2 === 0 ? 'user' : 'assistant',
    content: `message ${i}`,
    timestamp: new Date(),
  }));
}

describe('TranscriptOverlayComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranscriptOverlayComponent, TranslateModule.forRoot()],
    });
  });

  it('renders at most 20 messages (last 20 of 30)', () => {
    const fixture = TestBed.createComponent(TranscriptOverlayComponent);
    fixture.componentRef.setInput('messages', makeMessages(30));
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.message-row');
    expect(rows.length).toBe(20);
    expect(rows[0].textContent).toContain('message 10');
  });

  it('emits closed event when close button clicked', () => {
    const fixture = TestBed.createComponent(TranscriptOverlayComponent);
    fixture.componentRef.setInput('messages', []);
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.overlay-close')!.click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('emits closed when clicking outside the overlay', () => {
    const fixture = TestBed.createComponent(TranscriptOverlayComponent);
    fixture.componentRef.setInput('messages', []);
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);
    fixture.detectChanges();
    document.body.click();
    expect(spy).toHaveBeenCalledOnce();
  });
});
