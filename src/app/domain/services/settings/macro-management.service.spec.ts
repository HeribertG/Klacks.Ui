// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MacroManagementService } from './macro-management.service';
import { DataMacroService } from 'src/app/infrastructure/api/settings/data-macro.service';
import { IMacro } from 'src/app/domain/models/settings/macro.interface';
import { Macro } from 'src/app/domain/models/settings/macro-class';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

describe('MacroManagementService', () => {
  let service: MacroManagementService;
  let dataMacroService: {
    readMacroList: ReturnType<typeof vi.fn>;
    updateMacro: ReturnType<typeof vi.fn>;
    addMacro: ReturnType<typeof vi.fn>;
    deleteMacro: ReturnType<typeof vi.fn>;
  };

  const STORED_CONTENT = 'OUTPUT 1, Hour';
  const ACCEPTED_CONTENT = 'OUTPUT 1, 1';
  const STORED_MACRO_COUNT = 2;
  const EDITED_CONTENT = "OUTPUT 1, Hour\n' my note";

  const buildStored = (id: string, name: string, content: string): IMacro =>
    Object.assign(new Macro(), {
      id,
      name,
      content,
      category: MacroCategoryEnum.Unspecified,
      isDirty: CreateEntriesEnum.undefined,
    });

  const storedMacros = (): IMacro[] => [
    buildStored('macro-1', 'Accident', STORED_CONTENT),
    buildStored('macro-2', 'Military', 'OUTPUT 1, 0'),
  ];

  const editFirstMacro = (): IMacro => {
    const macros = service.macroList();
    macros[0].content = EDITED_CONTENT;
    macros[0].isDirty = CreateEntriesEnum.rewrite;
    service.macroList.set([...macros]);
    return macros[0];
  };

  beforeEach(() => {
    dataMacroService = {
      readMacroList: vi.fn(() => of(storedMacros())),
      updateMacro: vi.fn(),
      addMacro: vi.fn(),
      deleteMacro: vi.fn(),
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [MacroManagementService, { provide: DataMacroService, useValue: dataMacroService }],
    });
    service = TestBed.inject(MacroManagementService);
    service.loadMacros();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the edited text of a macro whose update the server rejected', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const edited = editFirstMacro();

    // Act
    service.save();

    // Assert
    const afterSave = service.macroList().find((macro) => macro.id === 'macro-1');
    expect(afterSave).toBe(edited);
    expect(afterSave?.content).toBe(EDITED_CONTENT);
    expect(afterSave?.isDirty).toBe(CreateEntriesEnum.rewrite);
    expect(service.isDirty()).toBe(true);
  });

  it('lets the user save a rejected update again', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    editFirstMacro();
    service.save();

    // Act
    service.save();

    // Assert
    expect(dataMacroService.updateMacro).toHaveBeenCalledTimes(2);
  });

  it('keeps a new macro whose creation the server rejected', () => {
    // Arrange
    dataMacroService.addMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const created = new Macro();
    created.name = 'Night';
    created.content = EDITED_CONTENT;
    service.macroList.set([...service.macroList(), created]);

    // Act
    service.save();

    // Assert
    expect(service.macroList()).toContain(created);
    expect(service.macroList().length).toBe(3);
  });

  it('takes over the server state after a successful update', () => {
    // Arrange
    const edited = editFirstMacro();
    dataMacroService.updateMacro.mockReturnValue(of(edited));
    dataMacroService.readMacroList.mockReturnValue(
      of([buildStored('macro-1', 'Accident', EDITED_CONTENT), buildStored('macro-2', 'Military', 'OUTPUT 1, 0')])
    );

    // Act
    service.save();

    // Assert
    const afterSave = service.macroList().find((macro) => macro.id === 'macro-1');
    expect(afterSave).not.toBe(edited);
    expect(afterSave?.content).toBe(EDITED_CONTENT);
    expect(afterSave?.isDirty).toBe(CreateEntriesEnum.undefined);
    expect(service.isDirty()).toBe(false);
  });

  it('keeps a rejected edit through a reload that something else triggered', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const edited = editFirstMacro();
    service.save();

    // Act
    service.loadMacros();
    service.loadMacros();

    // Assert
    expect(service.macroList().find((macro) => macro.id === 'macro-1')).toBe(edited);
    expect(service.isDirty()).toBe(true);
  });

  it('keeps the rejected macro and takes the stored one when a save of two macros is only half accepted', () => {
    // Arrange
    const macros = service.macroList();
    macros[0].content = EDITED_CONTENT;
    macros[0].isDirty = CreateEntriesEnum.rewrite;
    macros[1].content = ACCEPTED_CONTENT;
    macros[1].isDirty = CreateEntriesEnum.rewrite;
    service.macroList.set([...macros]);
    const [rejected, accepted] = macros;
    dataMacroService.updateMacro.mockImplementation((macro: IMacro) =>
      macro === rejected ? throwError(() => new Error('rejected')) : of(macro)
    );
    dataMacroService.readMacroList.mockReturnValue(
      of([buildStored('macro-1', 'Accident', STORED_CONTENT), buildStored('macro-2', 'Military', ACCEPTED_CONTENT)])
    );

    // Act
    service.save();

    // Assert
    const afterSave = service.macroList();
    expect(afterSave.find((macro) => macro.id === 'macro-1')).toBe(rejected);
    expect(afterSave.find((macro) => macro.id === 'macro-2')).not.toBe(accepted);
    expect(afterSave.find((macro) => macro.id === 'macro-2')?.content).toBe(ACCEPTED_CONTENT);
  });

  it('discards one rejected macro and leaves the other unsaved macro alone', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    dataMacroService.addMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const edited = editFirstMacro();
    const created = new Macro();
    created.name = 'Night';
    service.macroList.set([...service.macroList(), created]);
    service.save();

    // Act
    service.discardUnsavedMacro(edited);

    // Assert
    const restored = service.macroList().find((macro) => macro.id === 'macro-1');
    expect(restored).not.toBe(edited);
    expect(restored?.content).toBe(STORED_CONTENT);
    expect(service.macroList()).toContain(created);
  });

  it('does not bring a discarded macro back at the next reload', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const edited = editFirstMacro();
    service.save();
    service.discardUnsavedMacro(edited);

    // Act
    service.loadMacros();

    // Assert
    expect(service.macroList()).not.toContain(edited);
    expect(service.isDirty()).toBe(false);
  });

  it('removes a rejected new macro when it is discarded', () => {
    // Arrange
    dataMacroService.addMacro.mockReturnValue(throwError(() => new Error('rejected')));
    const created = new Macro();
    created.name = 'Night';
    service.macroList.set([...service.macroList(), created]);
    service.save();

    // Act
    service.discardUnsavedMacro(created);
    service.loadMacros();

    // Assert
    expect(service.macroList()).not.toContain(created);
    expect(service.macroList().length).toBe(STORED_MACRO_COUNT);
  });

  it('leaves the list alone when the discarded macro is no longer part of it', () => {
    // Arrange
    const stale = buildStored('macro-1', 'Accident', EDITED_CONTENT);
    stale.isDirty = CreateEntriesEnum.new;
    const before = service.macroList();

    // Act
    service.discardUnsavedMacro(stale);

    // Assert
    expect(service.macroList()).toBe(before);
  });

  it('starts without the rejected edit when the settings page loads its data again', async () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    editFirstMacro();
    service.save();

    // Act
    await service.loadMacrosAsync();

    // Assert
    expect(service.macroList().find((macro) => macro.id === 'macro-1')?.content).toBe(STORED_CONTENT);
    expect(service.isDirty()).toBe(false);
  });

  it('does not carry a rejected edit into a later reload the user asked for', () => {
    // Arrange
    dataMacroService.updateMacro.mockReturnValue(throwError(() => new Error('rejected')));
    editFirstMacro();
    service.save();

    // Act
    service.resetData();

    // Assert
    expect(service.macroList().find((macro) => macro.id === 'macro-1')?.content).toBe(STORED_CONTENT);
    expect(service.isDirty()).toBe(false);
  });

  describe('rowKey', () => {
    const CREATED_ID = 'macro-created';

    const addNewMacro = (): IMacro => {
      const created = Object.assign(new Macro(), { name: 'Night', content: ACCEPTED_CONTENT, isDirty: CreateEntriesEnum.new });
      service.macroList.set([...service.macroList(), created]);
      return created;
    };

    it('identifies a stored macro by its id', () => {
      // Act
      const key = service.rowKey(service.macroList()[0]);

      // Assert
      expect(key).toBe('macro-1');
    });

    it('gives two new macros different keys and keeps each key stable', () => {
      // Arrange
      const first = addNewMacro();
      const second = addNewMacro();

      // Act
      const firstKey = service.rowKey(first);
      const secondKey = service.rowKey(second);

      // Assert
      expect(firstKey).not.toBe(secondKey);
      expect(service.rowKey(first)).toBe(firstKey);
    });

    it('keeps the key of a new macro for the stored macro the server made of it', () => {
      // Arrange
      const created = addNewMacro();
      const keyBeforeSave = service.rowKey(created);
      const storedAfterCreate = [...storedMacros(), buildStored(CREATED_ID, 'Night', ACCEPTED_CONTENT)];
      dataMacroService.addMacro.mockReturnValue(of(buildStored(CREATED_ID, 'Night', ACCEPTED_CONTENT)));
      dataMacroService.readMacroList.mockReturnValue(of(storedAfterCreate));

      // Act
      service.save();

      // Assert
      const loaded = service.macroList().find((macro) => macro.id === CREATED_ID);
      expect(loaded).toBeDefined();
      expect(loaded).not.toBe(created);
      expect(service.rowKey(loaded as IMacro)).toBe(keyBeforeSave);
    });

    it('keeps the key of a new macro whose create the server rejected', () => {
      // Arrange
      const created = addNewMacro();
      const keyBeforeSave = service.rowKey(created);
      dataMacroService.addMacro.mockReturnValue(throwError(() => new Error('rejected')));

      // Act
      service.save();

      // Assert
      expect(service.macroList()).toContain(created);
      expect(service.rowKey(created)).toBe(keyBeforeSave);
    });
  });
});
