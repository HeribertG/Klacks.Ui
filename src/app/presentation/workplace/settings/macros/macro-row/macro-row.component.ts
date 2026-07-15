// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component for a single macro entry in the macro settings list.
 * @param data - The macro entity to display and edit
 */
import {
  Component, ChangeDetectionStrategy,
  OnDestroy,
  TemplateRef,
  inject,
  signal,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { form, FormField, debounce } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CodeEditorComponent } from '@fsegurai/ngx-codemirror';
import { EditorSelection } from '@codemirror/state';
import { klacksScriptLanguage as klacksScriptExtensions, errorExtensions, setError, clearError } from 'src/app/infrastructure/scripting/klacks-script-language';

import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MacroFunction, MacroFunctionLabels } from 'src/app/domain/enums/macro-function.enum';
import { MacroCategoryEnum, MacroCategoryLabels } from 'src/app/domain/enums/macro-category.enum';
import { IMacro, Macro } from 'src/app/domain/models/settings/macro-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PropertyGridComponent } from '../property-grid/property-grid.component';
import { ShiftData } from 'src/app/domain/models/shift/shift-data-class';
import {
  ScriptService,
  ExternalVariables,
} from 'src/app/infrastructure/scripting/script.service';
import { ScriptResult } from 'src/app/infrastructure/scripting/script-result';
import { MacroManagementService } from 'src/app/domain/services/settings/macro-management.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

import { DomainMessages } from 'src/app/domain/constants/messages';
interface MacroFormModel {
  name: string;
  type: string;
  content: string;
  category: string;
}

@Component({
  selector: 'app-macro-row',
  templateUrl: './macro-row.component.html',
  styleUrls: ['./macro-row.component.scss'],
  standalone: true,
  imports: [
    FormField,
    FormsModule,
    TranslateModule,
    NgbModule,
    CodeEditorComponent,
    PropertyGridComponent,
    TrashIconRedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroRowComponent implements OnDestroy {
  readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('content');
  readonly codeEditor = viewChild<CodeEditorComponent>('codemirror');
  readonly data = input<IMacro>(new Macro());
  readonly isDeleteEvent = output<void>();
  readonly cancelNewEvent = output<void>();
  readonly macroChangedEvent = output<void>();

  private wasSaved = false;
  private destroy$ = new Subject<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private scriptService = inject(ScriptService);
  private manualLoader = inject(ManualLoaderService);
  private macroManagementService = inject(MacroManagementService);

  private isInitialized = false;
  private lastModel: MacroFormModel | null = null;
  private macroModel = signal<MacroFormModel>({
    name: '',
    type: '0',
    content: '',
    category: '0',
  });
  macroForm = form(this.macroModel, f => {
    debounce(f.name, 300);
    debounce(f.type, 300);
    debounce(f.content, 300);
    debounce(f.category, 300);
  });

  description?: MultiLanguage;
  tabId = signal('macro');
  editorContent = signal('');

  shiftData = new ShiftData();

  test = signal('');
  manualContent = signal('');

  macroFunctionOptions = Object.values(MacroFunction)
    .filter((v): v is MacroFunction => typeof v === 'number')
    .map((value) => ({
      value,
      label: MacroFunctionLabels[value] ?? '',
    }));

  macroCategoryOptions = Object.values(MacroCategoryEnum)
    .filter((v): v is MacroCategoryEnum => typeof v === 'number')
    .map((value) => ({
      value,
      label: MacroCategoryLabels[value],
    }));

  klacksScriptLanguage = [...klacksScriptExtensions, ...errorExtensions];

  constructor() {
    effect(() => {
      const d = this.data();
      if (d) {
        const strippedContent = this.stripImports(d.content || '');
        const initialModel: MacroFormModel = {
          name: d.name || '',
          type: String(d.type ?? 0),
          content: strippedContent,
          category: String(d.category ?? 0),
        };
        this.macroModel.set(initialModel);
        this.lastModel = { ...initialModel };
        this.editorContent.set(strippedContent);
        this.isInitialized = true;
      }
    });

    effect(() => {
      const model = this.macroModel();
      if (this.isInitialized && this.data() && this.hasModelChanged(model)) {
        this.lastModel = { ...model };
      }
    });
  }

  private hasModelChanged(model: MacroFormModel): boolean {
    if (!this.lastModel) return false;
    return (
      model.name !== this.lastModel.name ||
      model.type !== this.lastModel.type ||
      model.content !== this.lastModel.content ||
      model.category !== this.lastModel.category
    );
  }

  private readonly AUTO_IMPORTS = [
    'import hour',
    'import fromhour',
    'import untilhour',
    'import weekday',
    'import holiday',
    'import holidaynextday',
    'import nightrate',
    'import holidayrate',
    'import sarate',
    'import sorate',
    'import guaranteedhours',
    'import fulltime'
  ];

  private stripImports(code: string): string {
    if (!code) return '';
    return code
      .split('\n')
      .filter(line => !line.trim().toLowerCase().startsWith('import '))
      .join('\n')
      .trim();
  }

  private addImports(code: string): string {
    if (!code) return this.AUTO_IMPORTS.join('\n');
    return this.AUTO_IMPORTS.join('\n') + '\n\n' + code;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onChange(): void {
    const d = this.data();
    if (
      d &&
      (d.isDirty === undefined ||
        d.isDirty === CreateEntriesEnum.undefined)
    ) {
      d.isDirty = CreateEntriesEnum.rewrite;
    }
    this.macroChangedEvent.emit();
  }

  open(content: unknown): void {
    this.openModalInternal(content);
  }

  openModal(): void {
    this.openModalInternal(this.contentTemplate());
  }

  private openModalInternal(content: unknown): void {
    const d = this.data();
    if (d) {
      const strippedContent = this.stripImports(d.content || '');
      const initialModel: MacroFormModel = {
        name: d.name || '',
        type: String(d.type ?? 0),
        content: strippedContent,
        category: String(d.category ?? 0),
      };
      this.macroModel.set(initialModel);
      this.lastModel = { ...initialModel };
      this.editorContent.set(strippedContent);
      this.description = d.description;
    }

    this.wasSaved = false;
    this.tabId.set('macro');
    this.test.set('');
    this.loadManual();

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        this.commitFormToData();
        this.wasSaved = true;
        this.onChange();
        this.macroManagementService.save();
      },
      () => {
        const d2 = this.data();
        if (!this.wasSaved && d2.isDirty === CreateEntriesEnum.new) {
          this.cancelNewEvent.emit();
        }
      }
    );
  }

  private commitFormToData(): void {
    const saved = this.data();
    if (saved) {
      const model = this.macroModel();
      saved.name = model.name;
      saved.type = +model.type;
      saved.category = +model.category as MacroCategoryEnum;
      saved.content = this.addImports(this.editorContent());
      saved.description = this.description;
    }
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    const conflict = this.findStandardFunctionConflict();
    if (conflict) {
      const messageKey =
        +this.macroModel().type === MacroFunction.StandardAdditive
          ? 'setting.macro.function.standard-additive-conflict'
          : 'setting.macro.function.standard-conflict';
      errors.push(
        this.translate.instant(messageKey, {
          name: conflict.name,
        })
      );
    }

    return errors;
  }

  private findStandardFunctionConflict(): IMacro | null {
    const model = this.macroModel();
    const modelFunction = +model.type as MacroFunction;
    if (modelFunction === MacroFunction.Custom) {
      return null;
    }

    const category = +model.category as MacroCategoryEnum;
    const current = this.data();

    const conflict = this.macroManagementService.macroList().find(
      (macro) =>
        macro !== current &&
        macro.isDirty !== CreateEntriesEnum.delete &&
        macro.type === modelFunction &&
        macro.category === category
    );

    return conflict ?? null;
  }

  onClickData(): void {
    this.tabId.set('data');
    const codemirror = document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  onEditorContentChange(content: string): void {
    this.editorContent.set(content);
  }

  onSave(): void {
    if (this.getValidationErrors().length > 0) {
      return;
    }

    this.commitFormToData();
    this.wasSaved = true;
    this.onChange();
    this.macroManagementService.save();
  }

  onSaveAndClose(modal: { close: () => void }): void {
    if (this.getValidationErrors().length > 0) {
      return;
    }

    modal.close();
  }

  onCheckMacro(): void {
    const code = this.editorContent();
    if (!code) {
      this.test.set('No macro code to check');
      return;
    }

    const compiled = this.scriptService.compile(code, false, true);
    if (compiled.hasError) {
      const line = compiled.error?.line ?? 1;
      const column = compiled.error?.column ?? 1;
      this.test.set(`Compile Error:\n${compiled.error?.description ?? 'Unknown error'}\nLine: ${line}, Column: ${column}`);
      this.setCursorPosition(line, column);
    } else {
      this.test.set('Syntax OK');
      this.clearErrorMark();
    }
  }

  private setCursorPosition(line: number, column: number): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (this.codeEditor() as any)?.view;
    if (!view) return;

    const code = this.editorContent();
    const lines = code.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    pos += Math.max(0, column - 1);
    pos = Math.min(pos, code.length);

    const lineEnd = line <= lines.length ? pos + (lines[line - 1]?.length ?? 0) - (column - 1) : pos + 1;
    const errorEnd = Math.min(lineEnd, code.length);

    view.dispatch({
      selection: EditorSelection.cursor(pos),
      scrollIntoView: true,
    });
    setError(view, pos, Math.max(pos + 1, errorEnd));
    view.focus();
  }

  private clearErrorMark(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view = (this.codeEditor() as any)?.view;
    if (!view) return;
    clearError(view);
  }

  onRunMacro(): void {
    const code = this.editorContent();
    if (!code) {
      this.test.set('No macro code to run');
      return;
    }

    const codeWithImports = this.addImports(code);
    const importLineCount = this.AUTO_IMPORTS.length + 1;
    const externalVars = this.buildExternalVariables();
    const result: ScriptResult = this.scriptService.run(
      codeWithImports,
      false,
      true,
      externalVars
    );
    if (result.success) {
      const messages = result.messages
        .map((m) => `[${m.type}] ${m.message}`)
        .join('\n');
      this.test.set(messages || 'Script executed successfully (no output)');
      this.clearErrorMark();
    } else {
      const adjustedLine = Math.max(1, (result.error?.line ?? 0) - importLineCount);
      const column = result.error?.column ?? 1;
      this.test.set(`Runtime Error:\n${result.error?.description ?? 'Unknown error'}\nLine: ${adjustedLine}, Column: ${column}`);
      this.setCursorPosition(adjustedLine, column);
    }
  }

  private buildExternalVariables(): ExternalVariables {
    return { ...this.shiftData };
  }

  loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    this.manualLoader.loadManual('macro-manual', lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }
}
