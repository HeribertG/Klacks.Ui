// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SavebarComponent } from './savebar.component';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';

const SCENARIO_BLOCKED_KEY = 'scenario.shiftEditBlocked';
const SCENARIO_BLOCKED_TEXT = 'Shifts cannot be edited in a scenario';
const TRANSLATION_LANGUAGE = 'en';

describe('SavebarComponent - shift save in scenario and variant mode', () => {
  let isScenarioMode: WritableSignal<boolean>;
  let entity: WritableSignal<string>;
  let component: SavebarComponent;

  beforeEach(() => {
    isScenarioMode = signal(false);
    entity = signal<string>(EntityName.SHIFT_EDIT);

    TestBed.configureTestingModule({
      imports: [SavebarComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: WorkplaceStateService,
          useValue: { nameOfVisibleEntity: () => entity(), goBack: () => '', isDirty: false, canSave: true, isDisabled: false },
        },
        {
          provide: SavebarService,
          useValue: {
            showSavebar: () => true,
            savebarConfig: () => ({ showSaveButtons: true, showSaveAndCloseButton: false }),
          },
        },
        { provide: NavigationService, useValue: {} },
        { provide: AnalyseScenarioService, useValue: { isScenarioMode } },
      ],
    });
    component = TestBed.createComponent(SavebarComponent).componentInstance;
  });

  it('blocks saving a shift while a scenario is open (a shift never lives in a scenario)', () => {
    // Arrange
    isScenarioMode.set(true);

    // Assert
    expect(component.isShiftScenarioBlocked()).toBe(true);
  });

  it('blocks saving a cut while a scenario is open', () => {
    // Arrange
    isScenarioMode.set(true);
    entity.set(EntityName.SHIFT_CUT);

    // Assert
    expect(component.isShiftScenarioBlocked()).toBe(true);
  });

  it('does not block saving a shift when neither mode is active', () => {
    // Assert
    expect(component.isShiftScenarioBlocked()).toBe(false);
  });

  it('does not block other editors while a scenario is open', () => {
    // Arrange
    isScenarioMode.set(true);
    entity.set(EntityName.CLIENT);

    // Assert
    expect(component.isShiftScenarioBlocked()).toBe(false);
  });

  it('gives no block explanation while saving is allowed', () => {
    // Assert
    expect(component.scenarioBlockTitleKey()).toBe('');
  });

  it('names the block explanation key while a scenario blocks saving', () => {
    // Arrange
    isScenarioMode.set(true);

    // Assert
    expect(component.scenarioBlockTitleKey()).toBe(SCENARIO_BLOCKED_KEY);
  });

  it('shows the translated block explanation on the save button once the translations arrive after the first render', () => {
    // Arrange
    isScenarioMode.set(true);
    const fixture = TestBed.createComponent(SavebarComponent);
    fixture.detectChanges();
    const saveButton = (): HTMLElement => fixture.nativeElement.querySelector('#shift-save-btn');
    expect(saveButton().title).toBe(SCENARIO_BLOCKED_KEY);

    // Act
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(TRANSLATION_LANGUAGE, { [SCENARIO_BLOCKED_KEY]: SCENARIO_BLOCKED_TEXT });
    translate.use(TRANSLATION_LANGUAGE);
    fixture.detectChanges();

    // Assert
    expect(saveButton().title).toBe(SCENARIO_BLOCKED_TEXT);
  });
});
