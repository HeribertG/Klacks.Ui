// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { signal, WritableSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TranscriptOverlayComponent } from './transcript-overlay.component';
import { TranscriptOverlayService } from './transcript-overlay.service';
import { ConversationOrchestratorService } from '../../aside/assistant-chat/services/conversation-orchestrator.service';
import type { ChatMessage } from '../../aside/assistant-chat/chat-message.interface';

function makeMessages(n: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    sender: i % 2 === 0 ? 'user' : 'assistant',
    content: `message ${i}`,
    timestamp: new Date(),
  }));
}

describe('TranscriptOverlayComponent', () => {
  let messages: WritableSignal<readonly ChatMessage[]>;
  let service: TranscriptOverlayService;

  beforeEach(() => {
    messages = signal<readonly ChatMessage[]>([]);
    TestBed.configureTestingModule({
      imports: [TranscriptOverlayComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ConversationOrchestratorService, useValue: { messages } },
      ],
    });
    service = TestBed.inject(TranscriptOverlayService);
  });

  function render() {
    const fixture = TestBed.createComponent(TranscriptOverlayComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders at most 20 messages (last 20 of 30)', () => {
    messages.set(makeMessages(30));
    service.show();
    const fixture = render();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('.message-row');
    expect(rows.length).toBe(20);
    expect(rows[0].textContent).toContain('message 10');
  });

  it('stays off screen until the bubble gesture opens it', () => {
    messages.set(makeMessages(3));
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).querySelector('.transcript-card')).toBeNull();
  });

  it('opens expanded', () => {
    messages.set(makeMessages(3));
    service.show();
    const fixture = render();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.transcript-card');
    expect(card).not.toBeNull();
    expect(card!.classList.contains('collapsed')).toBe(false);
  });

  it('collapses to its icon on a toggle click without leaving the screen', () => {
    messages.set(makeMessages(3));
    service.show();
    const fixture = render();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.transcript-toggle')!
      .click();
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.transcript-card');
    expect(card!.classList.contains('collapsed')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.transcript-content')).toBeNull();
    expect(service.isOpen()).toBe(true);
  });

  it('leaves the screen on the close button', () => {
    messages.set(makeMessages(3));
    service.show();
    const fixture = render();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.transcript-close')!
      .click();
    fixture.detectChanges();

    expect(service.isOpen()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.transcript-card')).toBeNull();
  });

  // The card lives in its own lane now, so a click elsewhere in the rail is not aimed at it.
  it('stays open when something outside it is clicked', () => {
    messages.set(makeMessages(3));
    service.show();
    render();

    document.body.click();

    expect(service.isOpen()).toBe(true);
  });

  it('reopens expanded after it was closed while collapsed', () => {
    messages.set(makeMessages(3));
    service.show();
    service.toggleExpanded();
    service.close();
    service.show();
    const fixture = render();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.transcript-card');
    expect(card!.classList.contains('collapsed')).toBe(false);
  });
});
