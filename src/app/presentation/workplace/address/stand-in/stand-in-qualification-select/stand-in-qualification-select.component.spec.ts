// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import { STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS } from 'src/app/domain/constants/stand-in.constants';
import { StandInQualificationSelectComponent } from './stand-in-qualification-select.component';

const TOGGLE = '#stand-in-create-qualifications';
const MENU = '#stand-in-create-qualifications-menu';
const PLACEHOLDER_KEY = 'standIn.create.qualificationsPlaceholder';
const FIELD_KEY = 'standIn.create.qualifications';

const qualification = (id: string, name: string, emoji?: string): IQualification => ({
  id,
  name: { de: name, en: name },
  emoji,
  isTimeLimited: false,
  isLevelBinding: false,
  type: QualificationType.Work,
  countries: [],
  category: QualificationCategory.None,
});

const FIRST_AID = qualification('q-aid', 'First aid', '🩹');
const FORKLIFT = qualification('q-fork', 'Forklift licence');
const GERMAN = qualification('q-de', 'German', '🇩🇪');

describe('StandInQualificationSelectComponent', () => {
  let fixture: ComponentFixture<StandInQualificationSelectComponent>;
  let toggled: string[];

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const toggle = (): HTMLButtonElement => host().querySelector<HTMLButtonElement>(TOGGLE)!;
  const menu = (): HTMLElement => host().querySelector<HTMLElement>(MENU)!;

  const render = (qualifications: IQualification[], selected: string[]): void => {
    fixture.componentRef.setInput('qualifications', qualifications);
    fixture.componentRef.setInput('selectedIds', new Set(selected));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StandInQualificationSelectComponent, TranslateModule.forRoot()] });
    fixture = TestBed.createComponent(StandInQualificationSelectComponent);
    fixture.componentRef.setInput('lang', 'en');
    toggled = [];
    fixture.componentInstance.toggled.subscribe((id) => toggled.push(id));
  });

  afterEach(() => fixture.destroy());

  describe('closed', () => {
    it('shows a placeholder text and names the field and the placeholder as accessible name when nothing is chosen', () => {
      // Act
      render([FIRST_AID, FORKLIFT], []);

      // Assert
      expect(toggle().textContent).toContain(PLACEHOLDER_KEY);
      expect(toggle().getAttribute('aria-label')).toBe(`${FIELD_KEY}: ${PLACEHOLDER_KEY}`);
      expect(toggle().hasAttribute('title')).toBe(false);
    });

    it('shows only the symbols of the chosen qualifications, with their names as tooltip and in the accessible name', () => {
      // Act
      render([FIRST_AID, FORKLIFT, GERMAN], ['q-aid', 'q-de']);

      // Assert
      const symbols = Array.from(toggle().querySelectorAll('.qualification-select-symbol')).map((node) => node.textContent);
      expect(symbols).toEqual(['🩹', '🇩🇪']);
      expect(toggle().textContent).not.toContain('First aid');
      expect(toggle().getAttribute('title')).toBe('First aid, German');
      expect(toggle().getAttribute('aria-label')).toBe(`${FIELD_KEY}: First aid, German`);
    });

    it('shows the name of a chosen qualification that has no symbol', () => {
      // Act
      render([FIRST_AID, FORKLIFT], ['q-fork']);

      // Assert
      expect(toggle().querySelector('.qualification-select-symbol')).toBeNull();
      expect(toggle().querySelector('.qualification-select-short-name')?.textContent).toBe('Forklift licence');
    });

    it('cuts many chosen qualifications off after the visible limit with "+n"', () => {
      // Arrange
      const many = Array.from({ length: STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS + 3 }, (_, index) =>
        qualification(`q-${index}`, `Skill ${index}`, '⭐'),
      );

      // Act
      render(many, many.map((item) => item.id!));

      // Assert
      expect(toggle().querySelectorAll('.qualification-select-symbol').length).toBe(STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS);
      expect(toggle().querySelector('.qualification-select-more')?.textContent).toBe('+3');
      expect(toggle().getAttribute('title')).toContain(`Skill ${STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS + 2}`);
    });
  });

  describe('open', () => {
    it('lists every qualification with checkbox, symbol and name, ticking the chosen ones', () => {
      // Act
      render([FIRST_AID, FORKLIFT], ['q-aid']);

      // Assert
      const aid = menu().querySelector<HTMLElement>('#stand-in-create-qualification-q-aid')!;
      const fork = menu().querySelector<HTMLElement>('#stand-in-create-qualification-q-fork')!;
      expect(aid.textContent).toContain('🩹');
      expect(aid.textContent).toContain('First aid');
      expect(aid.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
      expect(fork.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(false);
    });

    it('shows in every row the checkbox, then the symbol right next to it, then the name', () => {
      // Act
      render([FIRST_AID], []);

      // Assert
      const row = menu().querySelector<HTMLElement>('#stand-in-create-qualification-q-aid')!;
      const [checkbox, symbol, name] = Array.from(row.children) as HTMLElement[];
      expect(checkbox.tagName).toBe('INPUT');
      expect(checkbox.getAttribute('type')).toBe('checkbox');
      expect(symbol.classList.contains('qualification-select-option-symbol')).toBe(true);
      expect(symbol.textContent).toBe('🩹');
      expect(symbol.hidden).toBe(false);
      expect(name.textContent).toBe('First aid');
      expect(row.children.length).toBe(3);
    });

    it('reports the switched qualification on a click and keeps the menu open', async () => {
      // Arrange
      render([FIRST_AID, FORKLIFT], []);
      toggle().click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Act
      menu().querySelector<HTMLInputElement>('#stand-in-create-qualification-q-fork input[type="checkbox"]')!.click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert
      expect(toggled).toEqual(['q-fork']);
      expect(menu().classList.contains('show')).toBe(true);
    });

    it('says that no qualification exists when the list is empty', () => {
      // Act
      render([], []);

      // Assert
      expect(menu().textContent).toContain('standIn.create.noQualifications');
    });

    it('opens with the keyboard and closes with escape', async () => {
      // Arrange
      render([FIRST_AID], []);
      const settle = async (): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
        await fixture.whenStable();
      };

      // Act
      toggle().focus();
      toggle().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await settle();
      const openedByKeyboard = menu().classList.contains('show');
      toggle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      // Assert
      expect(openedByKeyboard).toBe(true);
      expect(menu().classList.contains('show')).toBe(false);
    });
  });
});
