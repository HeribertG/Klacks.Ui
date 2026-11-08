// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import {
  STAND_IN_QUALIFICATION_SEARCH_THRESHOLD,
  STAND_IN_QUALIFICATION_VISIBLE_SYMBOLS,
} from 'src/app/domain/constants/stand-in.constants';
import { StandInQualificationSelectComponent } from './stand-in-qualification-select.component';

const TOGGLE = '#stand-in-create-qualifications';
const MENU = '#stand-in-create-qualifications-menu';
const SEARCH = '#stand-in-create-qualifications-search';
const LIST = '.qualification-select-list';
const ROW = '.qualification-select-option';
const SEARCH_PLACEHOLDER_KEY = 'placeholder.search-qualification';
const EMPTY_KEY = 'standIn.create.noQualifications';
const ZERO_LENGTH = /^0(px)?$/;
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

const manyQualifications = (count: number): IQualification[] =>
  Array.from({ length: count }, (_, index) => qualification(`q-${index}`, `Skill ${index}`, '⭐'));

describe('StandInQualificationSelectComponent', () => {
  let fixture: ComponentFixture<StandInQualificationSelectComponent>;
  let toggled: string[];

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const toggle = (): HTMLButtonElement => host().querySelector<HTMLButtonElement>(TOGGLE)!;
  const menu = (): HTMLElement => host().querySelector<HTMLElement>(MENU)!;
  const search = (): HTMLInputElement | null => host().querySelector<HTMLInputElement>(SEARCH);
  const rowIds = (): string[] => Array.from(menu().querySelectorAll<HTMLElement>(ROW)).map((row) => row.id);

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const openMenu = async (): Promise<void> => {
    toggle().click();
    await settle();
  };

  const typeInSearch = async (text: string): Promise<void> => {
    const field = search()!;
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };

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

    it('styles every row compact on one line with its own padding and no minimum height', () => {
      // Act
      render([FIRST_AID], []);

      // Assert
      const row = menu().querySelector<HTMLElement>('#stand-in-create-qualification-q-aid')!;
      const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
      const rowStyle = getComputedStyle(row);
      expect(row.classList.contains('qualification-select-option')).toBe(true);
      expect(rowStyle.minHeight).toMatch(ZERO_LENGTH);
      expect(rowStyle.paddingTop).toBe('4px');
      expect(rowStyle.paddingBottom).toBe('4px');
      expect(rowStyle.whiteSpace).toBe('nowrap');
      expect(getComputedStyle(checkbox).minHeight).toMatch(ZERO_LENGTH);
      expect(getComputedStyle(checkbox).paddingTop).toMatch(ZERO_LENGTH);
    });

    it('scrolls the list inside a limited height instead of growing the menu', () => {
      // Act
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD * 2), []);

      // Assert
      const listStyle = getComputedStyle(menu().querySelector<HTMLElement>(LIST)!);
      expect(listStyle.maxHeight).toBe('240px');
      expect(listStyle.overflowY).toBe('auto');
    });

    it('opens upwards first so the dialog footer stays free', async () => {
      // Arrange
      render([FIRST_AID], []);

      // Act
      await openMenu();

      // Assert
      expect(host().querySelector('.qualification-select')!.classList.contains('dropup')).toBe(true);
    });

    it('shows no search field below the threshold', () => {
      // Act
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD - 1), []);

      // Assert
      expect(search()).toBeNull();
    });

    it('shows a search field above the list from the threshold on', () => {
      // Act
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD), []);

      // Assert
      expect(search()).not.toBeNull();
      expect(search()!.getAttribute('placeholder')).toBe(SEARCH_PLACEHOLDER_KEY);
      expect(menu().firstElementChild!.contains(search())).toBe(true);
    });

    it('filters the rows by name, ignoring case, and keeps the chosen state', async () => {
      // Arrange
      const options = [...manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD), FIRST_AID, FORKLIFT];
      render(options, ['q-aid']);
      await openMenu();

      // Act
      await typeInSearch('FIRST');

      // Assert
      expect(rowIds()).toEqual(['stand-in-create-qualification-q-aid']);
      expect(menu().querySelector<HTMLInputElement>(`${ROW} input[type="checkbox"]`)!.checked).toBe(true);
    });

    it('shows no "no qualifications" hint when the search finds nothing', async () => {
      // Arrange
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD), []);
      await openMenu();

      // Act
      await typeInSearch('no such skill');

      // Assert
      expect(rowIds()).toEqual([]);
      expect(menu().textContent).not.toContain(EMPTY_KEY);
    });

    it('clears the search when the menu closes', async () => {
      // Arrange
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD), []);
      await openMenu();
      await typeInSearch('Skill 1');

      // Act
      toggle().click();
      await settle();
      await openMenu();

      // Assert
      expect(search()!.value).toBe('');
      expect(rowIds().length).toBe(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD);
    });

    it('closes only the pull-down on escape in the search field', async () => {
      // Arrange
      render(manyQualifications(STAND_IN_QUALIFICATION_SEARCH_THRESHOLD), []);
      await openMenu();
      const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

      // Act
      search()!.focus();
      search()!.dispatchEvent(escape);
      await settle();

      // Assert
      expect(menu().classList.contains('show')).toBe(false);
      expect(escape.defaultPrevented).toBe(true);
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
