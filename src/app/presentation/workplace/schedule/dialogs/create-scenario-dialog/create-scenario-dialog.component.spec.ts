// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CreateScenarioDialogComponent } from './create-scenario-dialog.component';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { ICreateAnalyseScenarioRequest } from 'src/app/domain/models/schedule/create-analyse-scenario-request.interface';

const GROUP_ID = 'group-1';

const variant = (id: string, overrides: Partial<IScenarioVariant> = {}): IScenarioVariant => ({
  id,
  name: `Key ${id}`,
  groupId: GROUP_ID,
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: `token-${id}`,
  status: AnalyseScenarioStatus.Active,
  isExpired: false,
  shiftCount: 2,
  ...overrides,
});

describe('CreateScenarioDialogComponent', () => {
  let variants: WritableSignal<IScenarioVariant[]>;
  let loadFailed: WritableSignal<boolean>;
  let canManage: WritableSignal<boolean>;
  let loadVariants: ReturnType<typeof vi.fn>;
  let createScenario: ReturnType<typeof vi.fn>;
  let selectedGroup: { id: string; name: string } | undefined;
  let dialog: CreateScenarioDialogComponent;

  const modal = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);

  const choiceRows = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('#scenario-variant-choices .variant-choice'));

  const checkbox = (id: string): HTMLInputElement =>
    document.querySelector<HTMLInputElement>(`#scenario-variant-choice-${id}`)!;

  const create = (): ICreateAnalyseScenarioRequest => {
    dialog.scenarioName.set('Winter plan');
    dialog.onConfirm();
    return createScenario.mock.calls.at(-1)![0] as ICreateAnalyseScenarioRequest;
  };

  const setUp = (group: { id: string; name: string } | undefined): void => {
    selectedGroup = group;
    const fixture = TestBed.createComponent(CreateScenarioDialogComponent);
    fixture.detectChanges();
    dialog = fixture.componentInstance;
  };

  beforeEach(() => {
    variants = signal<IScenarioVariant[]>([]);
    loadFailed = signal(false);
    canManage = signal(true);
    loadVariants = vi.fn();
    createScenario = vi.fn().mockReturnValue(of({ id: 'scenario-1' }));
    selectedGroup = { id: GROUP_ID, name: 'Night care' };

    TestBed.configureTestingModule({
      imports: [CreateScenarioDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AnalyseScenarioService, useValue: { createScenario } },
        {
          provide: DataManagementScheduleService,
          useValue: {
            visibleStartDate: new Date(2026, 9, 26),
            visibleEndDate: new Date(2026, 11, 6),
            periodStartDate: new Date(2026, 10, 1),
            periodEndDate: new Date(2026, 10, 30),
          },
        },
        {
          provide: GroupSelectionService,
          useValue: {
            get selectedGroup() {
              return selectedGroup;
            },
          },
        },
        { provide: ScenarioVariantService, useValue: { variants, loadFailed, canManage, loadVariants } },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
  });

  describe('a refused creation', () => {
    const choose = (): void => {
      variants.set([variant('variant-1')]);
      setUp(selectedGroup);
      dialog.open();
      dialog.onToggleVariant('variant-1');
    };

    const refuse = (response: HttpErrorResponse): void => {
      createScenario.mockReturnValue(throwError(() => response));
      dialog.scenarioName.set('Winter plan');
      dialog.onConfirm();
    };

    it('explains a consumed key by its code', () => {
      choose();

      refuse(new HttpErrorResponse({ status: 409, error: { errorCode: 'SCENARIO_VARIANT_CONSUMED' } }));

      expect(dialog.errorMessage()).toBe('scenarioVariant.error.consumed');
      expect(dialog.isSaving()).toBe(false);
    });

    it('explains a key that is gone', () => {
      choose();

      refuse(new HttpErrorResponse({ status: 404 }));

      expect(dialog.errorMessage()).toBe('scenarioVariant.error.gone');
    });

    it('keeps the general text when no key was chosen, the refusal cannot be about a key', () => {
      setUp(selectedGroup);
      dialog.open();

      refuse(new HttpErrorResponse({ status: 400, error: 'Bad name' }));

      expect(dialog.errorMessage()).toBe('scenario.error.createFailed');
    });

    it('keeps the general text for a failure that is no refusal', () => {
      choose();

      refuse(new HttpErrorResponse({ status: 500, error: 'Boom' }));

      expect(dialog.errorMessage()).toBe('scenario.error.createFailed');
    });

    it.each([
      ['without a chosen key', false],
      ['with a chosen key', true],
    ])('hands no raw failure text to the translation %s', (_case, withKey) => {
      if (withKey) {
        choose();
      } else {
        setUp(selectedGroup);
        dialog.open();
      }
      const instant = vi.spyOn(TestBed.inject(TranslateService), 'instant');

      refuse(new HttpErrorResponse({ status: 500, error: 'relation "x" does not exist', url: 'http://internal/api' }));

      expect(instant).toHaveBeenCalledWith('scenario.error.createFailed');
    });
  });

  it('loads the keys of the selected group when it opens', () => {
    // Arrange
    setUp(selectedGroup);

    // Act
    dialog.open();

    // Assert
    expect(loadVariants).toHaveBeenCalledWith(GROUP_ID);
  });

  it('offers only active keys, those of a subgroup included', () => {
    // Arrange
    variants.set([
      variant('a'),
      variant('accepted', { status: AnalyseScenarioStatus.Accepted }),
      variant('closed', { status: AnalyseScenarioStatus.Rejected }),
      variant('subgroup', { groupId: 'group-2' }),
    ]);
    setUp(selectedGroup);

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(choiceRows()).toHaveLength(2);
    expect(checkbox('a')).not.toBeNull();
    expect(checkbox('accepted')).toBeNull();
    expect(checkbox('closed')).toBeNull();
    expect(checkbox('subgroup')).not.toBeNull();
  });

  it('shows an expired key with a hint and keeps it selectable', () => {
    // Arrange
    variants.set([variant('old', { isExpired: true }), variant('current')]);
    setUp(selectedGroup);

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(choiceRows()).toHaveLength(2);
    const oldRow = choiceRows().find((row) => row.querySelector('#scenario-variant-choice-old'))!;
    expect(oldRow.querySelector('.variant-choice-expired')?.textContent).toContain('scenarioVariant.expired');
    expect(oldRow.getAttribute('title')).toBe('scenarioVariant.select.expiredHint');
    expect(checkbox('old').disabled).toBe(false);
    const currentRow = choiceRows().find((row) => row.querySelector('#scenario-variant-choice-current'))!;
    expect(currentRow.querySelector('.variant-choice-expired')).toBeNull();
    expect(currentRow.hasAttribute('title')).toBe(false);
  });

  it('sends the chosen keys as variantIds', () => {
    // Arrange
    variants.set([variant('a'), variant('b'), variant('c')]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();

    // Act
    checkbox('a').click();
    checkbox('c').click();
    const request = create();

    // Assert
    expect(request.variantIds).toEqual(['a', 'c']);
    expect(request.groupId).toBe(GROUP_ID);
    expect(request.name).toBe('Winter plan');
  });

  it('sends a chosen expired key too, the backend allows it', () => {
    // Arrange
    variants.set([variant('old', { isExpired: true })]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();

    // Act
    checkbox('old').click();

    // Assert
    expect(create().variantIds).toEqual(['old']);
  });

  it('omits variantIds when no key is chosen', () => {
    // Arrange
    variants.set([variant('a')]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();

    // Act
    const request = create();

    // Assert
    expect('variantIds' in request).toBe(false);
  });

  it('drops a key that is unticked again', () => {
    // Arrange
    variants.set([variant('a'), variant('b')]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();

    // Act
    checkbox('a').click();
    checkbox('b').click();
    checkbox('a').click();

    // Assert
    expect(create().variantIds).toEqual(['b']);
  });

  it('starts every opening with no key chosen', () => {
    // Arrange
    variants.set([variant('a')]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();
    checkbox('a').click();
    TestBed.inject(NgbModal).dismissAll();

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(dialog.selectedVariantIds().size).toBe(0);
    expect('variantIds' in create()).toBe(false);
  });

  it('lets a planner without the right to manage keys choose them', () => {
    // Arrange
    canManage.set(false);
    variants.set([variant('a')]);
    setUp(selectedGroup);
    dialog.open();
    TestBed.tick();

    // Act
    checkbox('a').click();

    // Assert
    expect(checkbox('a').disabled).toBe(false);
    expect(create().variantIds).toEqual(['a']);
  });

  it('says that the group has no active keys', () => {
    // Arrange
    variants.set([variant('accepted', { status: AnalyseScenarioStatus.Accepted })]);
    setUp(selectedGroup);

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(modal('#scenario-variant-choices-empty')).not.toBeNull();
    expect(choiceRows()).toHaveLength(0);
  });

  it('says that the keys could not be loaded', () => {
    // Arrange
    loadFailed.set(true);
    setUp(selectedGroup);

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(modal('#scenario-variant-choices-failed')).not.toBeNull();
  });

  it('shows no key selection and loads no keys without a selected group', () => {
    // Arrange
    setUp(undefined);

    // Act
    dialog.open();
    TestBed.tick();

    // Assert
    expect(modal('#scenario-variant-section')).toBeNull();
    expect(loadVariants).not.toHaveBeenCalled();
    expect('variantIds' in create()).toBe(false);
  });
});
