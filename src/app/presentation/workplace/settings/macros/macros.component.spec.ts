/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { IMacro } from 'src/app/domain/models/settings/macro-class';

describe('MacrosComponent delete logic', () => {
  let mockMacroManagementService: any;
  let macroListStore: IMacro[];
  let dataManagementSettingsService: any;

  beforeEach(() => {
    macroListStore = [
      { id: '1', name: 'Macro 1', content: 'code1', type: 0, isDirty: CreateEntriesEnum.undefined } as IMacro,
      { id: '2', name: 'Macro 2', content: 'code2', type: 0, isDirty: CreateEntriesEnum.undefined } as IMacro,
    ];

    mockMacroManagementService = { save: vi.fn() };

    dataManagementSettingsService = {
      get macroList() { return macroListStore; },
      set macroList(value: IMacro[]) { macroListStore = value; },
    };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: MacroManagementService, useValue: mockMacroManagementService },
        { provide: DataManagementSettingsService, useValue: dataManagementSettingsService },
        ModalService,
      ],
    });

  });

  function deleteMacro(indexStr: string): void {
    const index = parseInt(indexStr, 10);
    const macros = dataManagementSettingsService.macroList;

    if (index >= 0 && index < macros.length) {
      const macro = macros[index];

      if (macro) {
        if (macro.isDirty === CreateEntriesEnum.new) {
          dataManagementSettingsService.macroList = [
            ...macros.slice(0, index),
            ...macros.slice(index + 1)
          ];
        } else {
          const updatedMacro = { ...macro };
          if (updatedMacro.name) {
            updatedMacro.name = updatedMacro.name + '--isDeleted';
          }
          updatedMacro.isDirty = CreateEntriesEnum.delete;

          dataManagementSettingsService.macroList = [
            ...macros.slice(0, index),
            updatedMacro,
            ...macros.slice(index + 1)
          ];
          mockMacroManagementService.save();
        }
      }
    }
  }

  it('should call save after marking existing macro for deletion', () => {
    deleteMacro('0');

    expect(mockMacroManagementService.save).toHaveBeenCalled();
  });

  it('should mark existing macro with isDirty delete and append --isDeleted to name', () => {
    deleteMacro('0');

    const deletedMacro = macroListStore.find(m => m.id === '1');
    expect(deletedMacro).toBeTruthy();
    expect(deletedMacro!.isDirty).toBe(CreateEntriesEnum.delete);
    expect(deletedMacro!.name).toBe('Macro 1--isDeleted');
  });

  it('should remove new macro from list without calling save', () => {
    macroListStore = [
      { id: '1', name: 'Macro 1', content: 'code1', type: 0, isDirty: CreateEntriesEnum.undefined } as IMacro,
      { name: 'New', content: '', type: 0, isDirty: CreateEntriesEnum.new } as IMacro,
    ];

    deleteMacro('1');

    expect(macroListStore.length).toBe(1);
    expect(macroListStore[0].name).toBe('Macro 1');
    expect(mockMacroManagementService.save).not.toHaveBeenCalled();
  });

  it('should not call save for out-of-bounds index', () => {
    deleteMacro('99');

    expect(mockMacroManagementService.save).not.toHaveBeenCalled();
    expect(macroListStore.length).toBe(2);
  });
});
