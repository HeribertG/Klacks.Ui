// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SearchInputComponent } from './search-input.component';

type Emission = ['value' | 'submit', string];

const DEBOUNCE_MS = 300;

describe('SearchInputComponent', () => {
  let fixture: ComponentFixture<SearchInputComponent>;
  let emissions: Emission[];

  const inputElement = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('input');

  const type = (text: string): void => {
    const input = inputElement();
    input.value = text;
    input.dispatchEvent(new Event('input'));
  };

  const pressEnter = (): void => {
    inputElement().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [SearchInputComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchInputComponent);
    emissions = [];
    fixture.componentInstance.valueChange.subscribe(v => emissions.push(['value', v]));
    fixture.componentInstance.searchSubmit.subscribe(v => emissions.push(['submit', v]));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits valueChange only after the debounce delay', () => {
    type('Messe');

    expect(emissions).toEqual([]);

    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(emissions).toEqual([['value', 'Messe']]);
  });

  it('flushes the pending value before searchSubmit when Enter comes within the debounce delay', () => {
    type('Messe');
    pressEnter();

    expect(emissions).toEqual([
      ['value', 'Messe'],
      ['submit', 'Messe'],
    ]);
  });

  it('does not emit a late valueChange after the flush', () => {
    type('Messe');
    pressEnter();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(emissions).toEqual([
      ['value', 'Messe'],
      ['submit', 'Messe'],
    ]);
  });

  it('flushes a pending empty value before searchSubmit', () => {
    type('');
    pressEnter();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(emissions).toEqual([
      ['value', ''],
      ['submit', ''],
    ]);
  });

  it('flushes the pending value when the search button is clicked', () => {
    type('Messe');
    fixture.nativeElement.querySelector('button').click();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(emissions).toEqual([
      ['value', 'Messe'],
      ['submit', 'Messe'],
    ]);
  });

  it('emits only searchSubmit when the debounced value was already emitted', () => {
    type('Messe');
    vi.advanceTimersByTime(DEBOUNCE_MS);
    pressEnter();

    expect(emissions).toEqual([
      ['value', 'Messe'],
      ['submit', 'Messe'],
    ]);
  });

  it('neither flushes nor submits while loading, and the debounced value still arrives', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    type('Messe');
    pressEnter();

    expect(emissions).toEqual([]);

    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(emissions).toEqual([['value', 'Messe']]);
  });

  it('emits valueChange immediately when the debounce is disabled', () => {
    fixture.componentRef.setInput('debounceMs', 0);
    fixture.detectChanges();

    type('Messe');
    pressEnter();

    expect(emissions).toEqual([
      ['value', 'Messe'],
      ['submit', 'Messe'],
    ]);
  });

  it('drops a pending value when destroyed', () => {
    type('Messe');
    fixture.destroy();
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(emissions).toEqual([]);
  });
});
