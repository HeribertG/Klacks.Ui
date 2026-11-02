// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SavebarComponent } from './savebar.component';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';

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
        { provide: WorkplaceStateService, useValue: { nameOfVisibleEntity: () => entity(), goBack: () => '' } },
        { provide: SavebarService, useValue: {} },
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
    expect(component.scenarioBlockTitle()).toBe('');
  });
});
