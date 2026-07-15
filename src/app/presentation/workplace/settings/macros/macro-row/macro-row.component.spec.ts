// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { MacroRowComponent } from './macro-row.component';
import { ScriptService } from 'src/app/infrastructure/scripting/script.service';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { IMacro } from 'src/app/domain/models/settings/macro-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroFunction } from 'src/app/domain/enums/macro-function.enum';
import { MacroCategoryEnum } from 'src/app/domain/enums/macro-category.enum';
import { WritableSignal, signal } from '@angular/core';

interface MacroFormModel {
  name: string;
  type: string;
  content: string;
  category: string;
}

interface MacroRowComponentPrivate {
  macroModel: WritableSignal<MacroFormModel>;
}

describe('MacroRowComponent', () => {
  let component: MacroRowComponent;
  let fixture: ComponentFixture<MacroRowComponent>;
  let mockModalService: { open: ReturnType<typeof vi.fn> };
  let mockScriptService: {
    compile: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
  let mockMacroManagementService: {
    save: ReturnType<typeof vi.fn>;
    macroList: WritableSignal<IMacro[]>;
  };

  const mockMacro: IMacro = {
    id: 'macro-1',
    name: 'Test Macro',
    type: MacroFunction.Custom,
    category: MacroCategoryEnum.Shift,
    content: 'dim x as integer\nx = 10',
    isDirty: CreateEntriesEnum.undefined,
  } as IMacro;

  beforeEach(async () => {
    mockModalService = {
      open: vi.fn().mockReturnValue({
        result: new Promise(() => {}),
      }),
    };

    mockScriptService = {
      compile: vi.fn().mockReturnValue({ hasError: false }),
      run: vi.fn().mockReturnValue({
        success: true,
        messages: [],
      }),
    };

    mockMacroManagementService = {
      save: vi.fn(),
      macroList: signal<IMacro[]>([]),
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue('Translated text'),
      get: vi.fn().mockReturnValue(of('Translated text')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
      currentLang: 'de',
    };

    await TestBed.configureTestingModule({
      imports: [
        MacroRowComponent,
        TranslateModule.forRoot(),
        HttpClientTestingModule,
      ],
      providers: [
        { provide: NgbModal, useValue: mockModalService },
        { provide: ScriptService, useValue: mockScriptService },
        { provide: MacroManagementService, useValue: mockMacroManagementService },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MacroRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', { ...mockMacro } as IMacro);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signal initialization', () => {
    it('should initialize editorContent as empty signal', () => {
      // Assert
      expect(component.editorContent()).toBe('');
    });

    it('should initialize tabId as macro', () => {
      // Assert
      expect(component.tabId()).toBe('macro');
    });

    it('should initialize test as empty signal', () => {
      // Assert
      expect(component.test()).toBe('');
    });

    it('should initialize manualContent as empty signal', () => {
      // Assert
      expect(component.manualContent()).toBe('');
    });
  });

  describe('input signal changes', () => {
    it('should initialize form with data values', () => {
      // Arrange & Act
      fixture.componentRef.setInput('data', {
        ...mockMacro,
        name: 'My Macro',
        type: MacroFunction.Standard,
        content: 'dim y as integer',
      } as IMacro);
      fixture.detectChanges();

      // Assert
      const model = (component as unknown as MacroRowComponentPrivate).macroModel();
      expect(model.name).toBe('My Macro');
      expect(model.type).toBe(String(MacroFunction.Standard));
      expect(component.editorContent()).toBe('dim y as integer');
    });
  });

  describe('Signal updates', () => {
    it('should update editorContent signal via onEditorContentChange', () => {
      // Act
      component.onEditorContentChange('dim y as integer');

      // Assert
      expect(component.editorContent()).toBe('dim y as integer');
    });

    it('should update tabId signal', () => {
      // Act
      component.tabId.set('test');

      // Assert
      expect(component.tabId()).toBe('test');
    });

    it('should update test signal', () => {
      // Act
      component.test.set('Test output');

      // Assert
      expect(component.test()).toBe('Test output');
    });
  });

  describe('onClickDelete', () => {
    it('should emit isDeleteEvent', () => {
      // Arrange
      const emitSpy = vi.spyOn(component.isDeleteEvent, 'emit');

      // Act
      component.onClickDelete();

      // Assert
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    it('should set isDirty to rewrite when undefined', () => {
      // Arrange
      component.data().isDirty = CreateEntriesEnum.undefined;

      // Act
      component.onChange();

      // Assert
      expect(component.data().isDirty).toBe(CreateEntriesEnum.rewrite);
    });

    it('should emit macroChangedEvent', () => {
      // Arrange
      const emitSpy = vi.spyOn(component.macroChangedEvent, 'emit');

      // Act
      component.onChange();

      // Assert
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('onClickData', () => {
    it('should set tabId to data', () => {
      // Arrange
      component.tabId.set('macro');

      // Act
      component.onClickData();

      // Assert
      expect(component.tabId()).toBe('data');
    });
  });

  describe('onSave', () => {
    it('should update data from form and editorContent', () => {
      // Arrange
      fixture.detectChanges();
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Updated Name',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });
      component.onEditorContentChange('new code');

      // Act
      component.onSave();

      // Assert
      expect(component.data().name).toBe('Updated Name');
      expect(component.data().type).toBe(MacroFunction.Standard);
      expect(component.data().content).toContain('new code');
    });

    it('should call macroManagementService.save', () => {
      // Act
      component.onSave();

      // Assert
      expect(mockMacroManagementService.save).toHaveBeenCalled();
    });

    it('should emit macroChangedEvent', () => {
      // Arrange
      const emitSpy = vi.spyOn(component.macroChangedEvent, 'emit');

      // Act
      component.onSave();

      // Assert
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('onCheckMacro', () => {
    it('should set test to error message when no code', () => {
      // Arrange
      component.onEditorContentChange('');

      // Act
      component.onCheckMacro();

      // Assert
      expect(component.test()).toBe('No macro code to check');
    });

    it('should call scriptService.compile with code', () => {
      // Arrange
      component.onEditorContentChange('dim x as integer');

      // Act
      component.onCheckMacro();

      // Assert
      expect(mockScriptService.compile).toHaveBeenCalledWith('dim x as integer', false, true);
    });

    it('should set test to Syntax OK when compilation succeeds', () => {
      // Arrange
      component.onEditorContentChange('dim x as integer');
      mockScriptService.compile.mockReturnValue({ hasError: false });

      // Act
      component.onCheckMacro();

      // Assert
      expect(component.test()).toBe('Syntax OK');
    });

    it('should set test to error message when compilation fails', () => {
      // Arrange
      component.onEditorContentChange('invalid code');
      mockScriptService.compile.mockReturnValue({
        hasError: true,
        error: { description: 'Syntax error', line: 1, column: 5 },
      });

      // Act
      component.onCheckMacro();

      // Assert
      expect(component.test()).toContain('Compile Error');
      expect(component.test()).toContain('Syntax error');
    });
  });

  describe('onRunMacro', () => {
    it('should set test to error message when no code', () => {
      // Arrange
      component.onEditorContentChange('');

      // Act
      component.onRunMacro();

      // Assert
      expect(component.test()).toBe('No macro code to run');
    });

    it('should call scriptService.run with code and imports', () => {
      // Arrange
      component.onEditorContentChange('dim x as integer');

      // Act
      component.onRunMacro();

      // Assert
      expect(mockScriptService.run).toHaveBeenCalled();
      const callArgs = mockScriptService.run.mock.calls[0];
      expect(callArgs[0]).toContain('import hour');
      expect(callArgs[0]).toContain('dim x as integer');
    });

    it('should set test to success message when run succeeds', () => {
      // Arrange
      component.onEditorContentChange('dim x as integer');
      mockScriptService.run.mockReturnValue({
        success: true,
        messages: [{ type: 'info', message: 'Output' }],
      });

      // Act
      component.onRunMacro();

      // Assert
      expect(component.test()).toContain('[info] Output');
    });

    it('should set test to error message when run fails', () => {
      // Arrange
      component.onEditorContentChange('invalid code');
      mockScriptService.run.mockReturnValue({
        success: false,
        error: { description: 'Runtime error', line: 15, column: 1 },
      });

      // Act
      component.onRunMacro();

      // Assert
      expect(component.test()).toContain('Runtime Error');
      expect(component.test()).toContain('Runtime error');
    });
  });

  describe('macroFunctionOptions', () => {
    it('should contain macro function options', () => {
      // Assert
      expect(component.macroFunctionOptions.length).toBeGreaterThan(0);
      expect(component.macroFunctionOptions[0]).toHaveProperty('value');
      expect(component.macroFunctionOptions[0]).toHaveProperty('label');
    });

    it('should not offer StandardAdditive', () => {
      // Assert
      const values = component.macroFunctionOptions.map((option) => option.value);
      expect(values).not.toContain(MacroFunction.StandardAdditive);
    });

    it('should offer Custom and Standard', () => {
      // Assert
      const values = component.macroFunctionOptions.map((option) => option.value);
      expect(values).toContain(MacroFunction.Custom);
      expect(values).toContain(MacroFunction.Standard);
    });
  });

  describe('getValidationErrors - Standard uniqueness per category', () => {
    it('should return no errors when function is Custom', () => {
      // Arrange
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Custom),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Assert
      expect(component.getValidationErrors()).toEqual([]);
    });

    it('should return no errors when no other macro in the category is Standard', () => {
      // Arrange
      mockMacroManagementService.macroList.set([{ ...mockMacro }]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Assert
      expect(component.getValidationErrors()).toEqual([]);
    });

    it('should return an error naming the existing Standard macro of the same category', () => {
      // Arrange
      const existingStandard: IMacro = {
        ...mockMacro,
        id: 'macro-2',
        name: 'Existing Standard Macro',
        type: MacroFunction.Standard,
        category: MacroCategoryEnum.Shift,
      };
      mockMacroManagementService.macroList.set([existingStandard]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Act
      const errors = component.getValidationErrors();

      // Assert
      expect(errors.length).toBe(1);
    });

    it('should ignore the macro itself when checking for conflicts', () => {
      // Arrange: the currently edited macro is already Standard for its category
      const dataAsStandard: IMacro = { ...mockMacro, type: MacroFunction.Standard };
      fixture.componentRef.setInput('data', dataAsStandard);
      mockMacroManagementService.macroList.set([dataAsStandard]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Assert
      expect(component.getValidationErrors()).toEqual([]);
    });

    it('should ignore macros marked for deletion', () => {
      // Arrange
      const deletedStandard: IMacro = {
        ...mockMacro,
        id: 'macro-3',
        type: MacroFunction.Standard,
        category: MacroCategoryEnum.Shift,
        isDirty: CreateEntriesEnum.delete,
      };
      mockMacroManagementService.macroList.set([deletedStandard]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Assert
      expect(component.getValidationErrors()).toEqual([]);
    });

    it('should block onSave when a conflict exists', () => {
      // Arrange
      const existingStandard: IMacro = {
        ...mockMacro,
        id: 'macro-2',
        name: 'Existing Standard Macro',
        type: MacroFunction.Standard,
        category: MacroCategoryEnum.Shift,
      };
      mockMacroManagementService.macroList.set([existingStandard]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });

      // Act
      component.onSave();

      // Assert
      expect(mockMacroManagementService.save).not.toHaveBeenCalled();
    });

    it('should block onSaveAndClose when a conflict exists', () => {
      // Arrange
      const existingStandard: IMacro = {
        ...mockMacro,
        id: 'macro-2',
        name: 'Existing Standard Macro',
        type: MacroFunction.Standard,
        category: MacroCategoryEnum.Shift,
      };
      mockMacroManagementService.macroList.set([existingStandard]);
      (component as unknown as MacroRowComponentPrivate).macroModel.set({
        name: 'Test Macro',
        type: String(MacroFunction.Standard),
        content: '',
        category: String(MacroCategoryEnum.Shift),
      });
      const closeSpy = vi.fn();

      // Act
      component.onSaveAndClose({ close: closeSpy });

      // Assert
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should allow onSaveAndClose when there is no conflict', () => {
      // Arrange
      const closeSpy = vi.fn();

      // Act
      component.onSaveAndClose({ close: closeSpy });

      // Assert
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      // Arrange
      const nextSpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      // Act
      component.ngOnDestroy();

      // Assert
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
