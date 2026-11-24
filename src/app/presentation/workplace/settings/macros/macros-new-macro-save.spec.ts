// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { MacrosComponent } from './macros.component';
import { MacroRowComponent } from './macro-row/macro-row.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { DataMacroService } from 'src/app/infrastructure/api/settings/data-macro.service';
import { SCRIPT_COMPILER } from 'src/app/domain/models/automation/rules/script-compiler.interface';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { IMacro } from 'src/app/domain/models/settings/macro.interface';
import { Macro } from 'src/app/domain/models/settings/macro-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('MacrosComponent: a new macro stays editable after its first save', () => {
  const CREATED_ID = 'macro-created';
  const NEW_NAME = 'Night';
  const FIRST_TEXT = 'OUTPUT 1, 1';
  const SECOND_TEXT = 'OUTPUT 1, 2';

  let fixture: ComponentFixture<MacrosComponent>;
  let macroManagementService: MacroManagementService;
  let stored: IMacro[];
  let dataMacroService: {
    readMacroList: ReturnType<typeof vi.fn>;
    addMacro: ReturnType<typeof vi.fn>;
    updateMacro: ReturnType<typeof vi.fn>;
    deleteMacro: ReturnType<typeof vi.fn>;
  };

  const buildStored = (id: string, name: string, content: string): IMacro =>
    Object.assign(new Macro(), { id, name, content, isDirty: CreateEntriesEnum.undefined });

  const renderedRows = (): MacroRowComponent[] =>
    fixture.debugElement
      .queryAll(By.directive(MacroRowComponent))
      .map((row) => row.componentInstance as MacroRowComponent);

  const addNewMacro = (): MacroRowComponent => {
    const newMacro = Object.assign(new Macro(), { name: NEW_NAME, isDirty: CreateEntriesEnum.new });
    macroManagementService.macroList.set([...macroManagementService.macroList(), newMacro]);
    fixture.detectChanges();
    const row = renderedRows().find((candidate) => candidate.data() === newMacro);
    if (!row) {
      throw new Error('the new macro has no row');
    }
    return row;
  };

  const saveFromDialog = (row: MacroRowComponent, text: string): void => {
    row.onEditorContentChange(text);
    row.onSave();
    fixture.detectChanges();
  };

  beforeEach(() => {
    stored = [buildStored('macro-1', 'Accident', 'OUTPUT 1, 0'), buildStored('macro-2', 'Zulu', 'OUTPUT 1, 0')];
    dataMacroService = {
      readMacroList: vi.fn(() => of(stored.map((macro) => ({ ...macro })))),
      addMacro: vi.fn((macro: IMacro) => {
        const created = { ...macro, id: CREATED_ID, isDirty: CreateEntriesEnum.undefined };
        stored = [...stored, created];
        return of(created);
      }),
      updateMacro: vi.fn((macro: IMacro) => of(macro)),
      deleteMacro: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [MacrosComponent, TranslateModule.forRoot(), HttpClientTestingModule],
      providers: [
        MacroManagementService,
        ModalService,
        { provide: DataMacroService, useValue: dataMacroService },
        { provide: SCRIPT_COMPILER, useValue: { compile: vi.fn(), execute: vi.fn() } },
        {
          provide: DataManagementSettingsService,
          useFactory: (macros: MacroManagementService) => ({ macros }),
          deps: [MacroManagementService],
        },
      ],
    });
    macroManagementService = TestBed.inject(MacroManagementService);
    macroManagementService.loadMacros();

    fixture = TestBed.createComponent(MacrosComponent);
    fixture.detectChanges();
  });

  it('keeps the row of a new macro when the server gave it an id', () => {
    // Arrange
    const row = addNewMacro();

    // Act
    saveFromDialog(row, FIRST_TEXT);

    // Assert
    expect(dataMacroService.addMacro).toHaveBeenCalledTimes(1);
    expect(renderedRows().includes(row)).toBe(true);
    expect(row.data().id).toBe(CREATED_ID);
  });

  it('sends a change made after the first save of a new macro as an update', () => {
    // Arrange
    const row = addNewMacro();
    saveFromDialog(row, FIRST_TEXT);

    // Act
    saveFromDialog(row, SECOND_TEXT);

    // Assert
    expect(dataMacroService.addMacro).toHaveBeenCalledTimes(1);
    expect(dataMacroService.updateMacro).toHaveBeenCalledTimes(1);
    const updated = dataMacroService.updateMacro.mock.calls[0][0] as IMacro;
    expect(updated.id).toBe(CREATED_ID);
    expect(updated.content).toContain(SECOND_TEXT);
  });

  it('keeps the rows of stored macros when the list is loaded again', () => {
    // Arrange
    const rowsBefore = renderedRows();

    // Act
    macroManagementService.loadMacros();
    fixture.detectChanges();

    // Assert
    const rowsAfter = renderedRows();
    expect(rowsAfter.length).toBe(rowsBefore.length);
    expect(rowsAfter.every((row, index) => row === rowsBefore[index])).toBe(true);
  });
});
