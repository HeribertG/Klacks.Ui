import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { MacroRowComponent } from './macro-row.component';
import { ScriptService } from 'src/app/infrastructure/scripting/script.service';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { IMacro, Macro } from 'src/app/domain/models/macro-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroTypes } from 'src/app/domain/enums/macro-type.enum';

describe('MacroRowComponent', () => {
  let component: MacroRowComponent;
  let fixture: ComponentFixture<MacroRowComponent>;
  let mockModalService: { open: ReturnType<typeof vi.fn> };
  let mockScriptService: {
    compile: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
  let mockMacroManagementService: { save: ReturnType<typeof vi.fn> };

  const mockMacro: IMacro = {
    id: 'macro-1',
    name: 'Test Macro',
    type: MacroTypes.ShiftAndEmployments,
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
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue('Translated text'),
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
    component.data = { ...mockMacro } as IMacro;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signal initialization', () => {
    it('should initialize macroName as empty signal', () => {
      // Assert
      expect(component.macroName()).toBe('');
    });

    it('should initialize macroType as 0', () => {
      // Assert
      expect(component.macroType()).toBe(0);
    });

    it('should initialize obj as empty signal', () => {
      // Assert
      expect(component.obj()).toBe('');
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

  describe('Signal updates', () => {
    it('should update macroName signal', () => {
      // Act
      component.macroName.set('New Name');

      // Assert
      expect(component.macroName()).toBe('New Name');
    });

    it('should update macroType signal', () => {
      // Act
      component.macroType.set(MacroTypes.WorkRules);

      // Assert
      expect(component.macroType()).toBe(MacroTypes.WorkRules);
    });

    it('should update obj signal', () => {
      // Act
      component.obj.set('dim y as integer');

      // Assert
      expect(component.obj()).toBe('dim y as integer');
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
      component.data.isDirty = CreateEntriesEnum.undefined;

      // Act
      component.onChange();

      // Assert
      expect(component.data.isDirty).toBe(CreateEntriesEnum.rewrite);
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
    it('should update data from signals', () => {
      // Arrange
      component.macroName.set('Updated Name');
      component.macroType.set(MacroTypes.WorkRules);
      component.obj.set('new code');

      // Act
      component.onSave();

      // Assert
      expect(component.data.name).toBe('Updated Name');
      expect(component.data.type).toBe(MacroTypes.WorkRules);
      expect(component.data.content).toContain('new code');
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
      component.obj.set('');

      // Act
      component.onCheckMacro();

      // Assert
      expect(component.test()).toBe('No macro code to check');
    });

    it('should call scriptService.compile with code', () => {
      // Arrange
      component.obj.set('dim x as integer');

      // Act
      component.onCheckMacro();

      // Assert
      expect(mockScriptService.compile).toHaveBeenCalledWith('dim x as integer', false, true);
    });

    it('should set test to Syntax OK when compilation succeeds', () => {
      // Arrange
      component.obj.set('dim x as integer');
      mockScriptService.compile.mockReturnValue({ hasError: false });

      // Act
      component.onCheckMacro();

      // Assert
      expect(component.test()).toBe('Syntax OK');
    });

    it('should set test to error message when compilation fails', () => {
      // Arrange
      component.obj.set('invalid code');
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
      component.obj.set('');

      // Act
      component.onRunMacro();

      // Assert
      expect(component.test()).toBe('No macro code to run');
    });

    it('should call scriptService.run with code and imports', () => {
      // Arrange
      component.obj.set('dim x as integer');

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
      component.obj.set('dim x as integer');
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
      component.obj.set('invalid code');
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

  describe('macroTypeOptions', () => {
    it('should contain macro type options', () => {
      // Assert
      expect(component.macroTypeOptions.length).toBeGreaterThan(0);
      expect(component.macroTypeOptions[0]).toHaveProperty('value');
      expect(component.macroTypeOptions[0]).toHaveProperty('label');
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
