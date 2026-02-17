/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { IAssistantFunctionCall, IAssistantFunctionResult } from '../../interfaces/assistant-function-definitions.interface';
import { waitForElement } from './assistant-execution-utils';

@Injectable()
export class AssistantExecutionMacroService {

  executeCreateMacro(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doCreateMacro(call));
  }

  private async doCreateMacro(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    const { name, type, content } = call.arguments;

    let macrosSection = document.getElementById('settings-macros');
    if (!macrosSection) {
      document.getElementById('open-settings')?.click();
      macrosSection = await waitForElement('settings-macros', 5000);
      if (!macrosSection) {
        return { id: call.id, success: false, error: 'Macros section not loaded' };
      }
    }
    macrosSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const addBtn = document.getElementById('macros-add-btn');
    if (!addBtn) {
      return { id: call.id, success: false, error: 'Add macro button not found' };
    }
    addBtn.click();

    let macroNameInput: HTMLInputElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      macroNameInput = document.getElementById('macroName') as HTMLInputElement;
      if (macroNameInput) break;
    }
    if (!macroNameInput) {
      return { id: call.id, success: false, error: 'Macro modal did not open' };
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    nativeSetter?.call(macroNameInput, name);
    macroNameInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (type) {
      const typeValue = type === 'WorkRules' ? '1' : '0';
      const typeSelect = document.getElementById('type') as HTMLSelectElement;
      if (typeSelect) {
        typeSelect.value = typeValue;
        typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    let checkResult = '';
    let runResult = '';

    if (content) {
      let editorView: any = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const cmContent = document.querySelector('#macro-modal-code-editor .cm-content') as any;
        if (cmContent?.cmView?.rootView?.view) {
          editorView = cmContent.cmView.rootView.view;
          break;
        }
      }

      if (!editorView) {
        return { id: call.id, success: false, error: 'Could not access CodeMirror EditorView' };
      }

      editorView.dispatch({
        changes: { from: 0, to: editorView.state.doc.length, insert: content },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      document.getElementById('macro-modal-check-btn')?.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const testOutput = document.getElementById('macro-modal-test-output') as HTMLTextAreaElement;
      checkResult = testOutput?.value || '';

      if (checkResult && !checkResult.includes('Syntax OK')) {
        return {
          id: call.id,
          success: false,
          error: `Script syntax check failed: ${checkResult}`,
        };
      }

      document.getElementById('macro-modal-tab-test-link')?.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      document.getElementById('macro-modal-run-btn')?.click();
      await new Promise(resolve => setTimeout(resolve, 2000));

      const testOutputAfterRun = document.getElementById('macro-modal-test-output') as HTMLTextAreaElement;
      runResult = testOutputAfterRun?.value || '';
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const saveCloseBtn = document.getElementById('macro-modal-save-close-btn');
    if (!saveCloseBtn) {
      return { id: call.id, success: false, error: 'Save & Close button not found in macro modal' };
    }
    saveCloseBtn.click();

    let macroId = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const nameInputs = document.querySelectorAll('input[id^="macro-row-name-"]');
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(name.toLowerCase())) {
          macroId = input.id.replace('macro-row-name-', '');
          break;
        }
      }
      if (macroId) break;
    }

    return {
      id: call.id,
      success: true,
      result: {
        macroId,
        name,
        type: type || 'ShiftAndEmployments',
        hasContent: !!content,
        checkResult,
        runResult,
        message: `Macro "${name}" created successfully.${macroId ? ` ID: ${macroId}` : ''}${content ? ` Script code inserted. Syntax check: ${checkResult || 'n/a'}. Test result: ${runResult || 'n/a'}` : ''}`,
      },
    };
  }

  executeDeleteMacro(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doDeleteMacro(call));
  }

  private async doDeleteMacro(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    const { macroId, macroName } = call.arguments;

    for (let i = 0; i < 10; i++) {
      const backdrop = document.querySelector('ngb-modal-backdrop, .modal-backdrop');
      if (!backdrop) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    let macrosSection = document.getElementById('settings-macros');
    if (!macrosSection) {
      document.getElementById('open-settings')?.click();
      macrosSection = await waitForElement('settings-macros', 5000);
      if (!macrosSection) {
        return { id: call.id, success: false, error: 'Macros section not loaded' };
      }
    }
    macrosSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    let resolvedId = macroId;
    let deleteBtn: HTMLElement | null = null;

    if (macroId) {
      deleteBtn = document.getElementById(`macro-row-delete-${macroId}`);
    }

    if (!deleteBtn) {
      const searchName = macroName || macroId;
      if (searchName) {
        const nameInputs = document.querySelectorAll('input[id^="macro-row-name-"]');
        for (const input of Array.from(nameInputs)) {
          const value = (input as HTMLInputElement).value;
          if (value.toLowerCase().includes(searchName.toLowerCase())) {
            resolvedId = input.id.replace('macro-row-name-', '');
            deleteBtn = document.getElementById(`macro-row-delete-${resolvedId}`);
            break;
          }
        }
      }
    }

    if (!deleteBtn) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (macroId) {
          deleteBtn = document.getElementById(`macro-row-delete-${macroId}`);
          if (deleteBtn) { resolvedId = macroId; break; }
        }
        const searchName = macroName || macroId;
        if (searchName) {
          const nameInputs = document.querySelectorAll('input[id^="macro-row-name-"]');
          for (const input of Array.from(nameInputs)) {
            const value = (input as HTMLInputElement).value;
            if (value.toLowerCase().includes(searchName.toLowerCase())) {
              resolvedId = input.id.replace('macro-row-name-', '');
              deleteBtn = document.getElementById(`macro-row-delete-${resolvedId}`);
              break;
            }
          }
        }
        if (deleteBtn) break;
      }
    }

    if (!deleteBtn) {
      return { id: call.id, success: false, error: `Delete button for macro ${macroName || macroId} not found` };
    }
    deleteBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 300));
    deleteBtn.click();

    let confirmBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      confirmBtn = document.getElementById('modal-delete-confirm');
      if (confirmBtn) break;
    }
    if (!confirmBtn) {
      return { id: call.id, success: false, error: 'Delete confirmation modal not found after 6s' };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    confirmBtn.click();

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const stillExists = document.getElementById(`macro-row-name-${resolvedId}`);
      if (!stillExists) {
        return {
          id: call.id,
          success: true,
          result: { macroId: resolvedId, message: `Macro '${macroName || resolvedId}' deleted successfully.` },
        };
      }
    }

    return { id: call.id, success: false, error: `Macro ${macroName || resolvedId} still exists after deletion (10s timeout)` };
  }

  executeListMacros(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doListMacros(call));
  }

  private async doListMacros(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    let macrosSection = document.getElementById('settings-macros');
    if (!macrosSection) {
      document.getElementById('open-settings')?.click();
      macrosSection = await waitForElement('settings-macros', 5000);
      if (!macrosSection) {
        return { id: call.id, success: false, error: 'Macros section not loaded' };
      }
    }
    macrosSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInputs = document.querySelectorAll('input[id^="macro-row-name-"]');
    const macros: { id: string; name: string }[] = [];

    for (const input of Array.from(nameInputs)) {
      const inputId = input.id;
      const macroId = inputId.replace('macro-row-name-', '');
      const macroName = (input as HTMLInputElement).value;
      macros.push({ id: macroId, name: macroName });
    }

    const macroList = macros.map(m => `- ${m.name} (ID: ${m.id})`).join('\n');

    return {
      id: call.id,
      success: true,
      result: { macros, count: macros.length, message: `${macros.length} macros found:\n${macroList}` },
    };
  }
}
