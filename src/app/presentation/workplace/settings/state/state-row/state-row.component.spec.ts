// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { StateRowComponent } from './state-row.component';
import { IState } from 'src/app/domain/models/client/client-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

describe('StateRowComponent', () => {
  let fixture: ComponentFixture<StateRowComponent>;
  let component: StateRowComponent;

  function build(currentLang: string, name: Record<string, string>): IState {
    const translateServiceSpy = {
      currentLang,
      instant: vi.fn().mockReturnValue('x'),
      get: vi.fn().mockReturnValue(of('x')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    TestBed.configureTestingModule({
      imports: [StateRowComponent, TranslateModule.forRoot()],
      providers: [{ provide: TranslateService, useValue: translateServiceSpy }],
    });

    const data: IState = {
      id: 'row-1',
      abbreviation: 'ZH',
      name: { ...name } as MultiLanguage,
      countryPrefix: 'CH',
      prefix: '',
      select: false,
      isDirty: 0,
    };

    fixture = TestBed.createComponent(StateRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return data;
  }

  function nameInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input.country-name') as HTMLInputElement;
  }

  it('renders the plugin-language name for a mixed-case locale (zh-CN -> zh-cn key)', () => {
    build('zh-CN', { de: 'Zürich', 'zh-cn': '苏黎世' });

    expect(nameInput().value).toBe('苏黎世');
  });

  it('renders the plugin-language name for a lower-case locale (pl)', () => {
    build('pl', { de: 'Zürich', pl: 'Zurych' });

    expect(nameInput().value).toBe('Zurych');
  });

  it('shows an empty name field when the current language is missing (no fallback leak)', () => {
    build('pl', { de: 'Zürich', en: 'Zurich' });

    expect(nameInput().value).toBe('');
  });

  it('writes edits into the current-language key and preserves the other languages', () => {
    const data = build('zh-CN', { de: 'Zürich', 'zh-cn': '苏黎世' });

    (component as any).stateModel.set({
      abbreviation: 'ZH',
      nameCurrent: '新苏黎世',
      countryPrefix: 'CH',
    });
    fixture.detectChanges();

    expect(data.name!['zh-cn']).toBe('新苏黎世');
    expect(data.name!.de).toBe('Zürich');
  });
});
