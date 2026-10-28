// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { PLAYGROUND_MAX_PROMPT_CHARS } from 'src/app/domain/constants/playground.constants';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundPromptCounterComponent } from './playground-prompt-counter.component';

describe('PlaygroundPromptCounterComponent', () => {
  let fixture: ComponentFixture<PlaygroundPromptCounterComponent>;

  const counter = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('.playground-counter');

  const render = (length: number, limitActive: boolean): void => {
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive, deviceToken: limitActive ? 'counterDeviceToken1234567890' : null });
    fixture = TestBed.createComponent(PlaygroundPromptCounterComponent);
    fixture.componentRef.setInput('length', length);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlaygroundPromptCounterComponent, TranslateModule.forRoot()],
      providers: [{ provide: LocalStorageService, useValue: { get: vi.fn(() => null), set: vi.fn() } }],
    });
  });

  it('renders nothing while the limit is inactive, even for a very long text', () => {
    render(PLAYGROUND_MAX_PROMPT_CHARS * 2, false);

    expect(counter()).toBeNull();
  });

  it('stays hidden for a short text while the limit is active', () => {
    render(1, true);

    expect(counter()).toBeNull();
  });

  it('shows the count near the limit and highlights it at the limit without naming the limit yet', () => {
    render(PLAYGROUND_MAX_PROMPT_CHARS - 1, true);
    expect(counter()?.textContent).toContain(`${PLAYGROUND_MAX_PROMPT_CHARS - 1} / ${PLAYGROUND_MAX_PROMPT_CHARS}`);
    expect(counter()?.classList.contains('at-limit')).toBe(false);

    fixture.componentRef.setInput('length', PLAYGROUND_MAX_PROMPT_CHARS);
    fixture.detectChanges();

    expect(counter()?.classList.contains('at-limit')).toBe(true);
    expect(counter()?.querySelector('.playground-counter-message')).toBeNull();
  });

  it('names the limit only once the text exceeds it', () => {
    render(PLAYGROUND_MAX_PROMPT_CHARS + 1, true);

    expect(counter()?.querySelector('.playground-counter-message')).not.toBeNull();
  });
});
