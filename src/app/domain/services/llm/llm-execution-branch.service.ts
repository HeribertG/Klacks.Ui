import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ILLMFunctionCall, ILLMFunctionResult } from '../../interfaces/llm-function-definitions.interface';
import { waitForElement } from './llm-execution-utils';

@Injectable()
export class LlmExecutionBranchService {

  executeCreateBranch(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    return from(this.doCreateBranch(call));
  }

  private async doCreateBranch(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { name, address, phone, email } = call.arguments;

    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }

    const addBtn = document.getElementById('branches-add-btn');
    if (!addBtn) {
      return { id: call.id, success: false, error: 'Add branch button not found' };
    }
    addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    addBtn.click();

    let modalName: HTMLInputElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      modalName = document.getElementById('branches-modal-name') as HTMLInputElement;
      if (modalName) break;
    }
    if (!modalName) {
      return { id: call.id, success: false, error: 'Branch modal did not open' };
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const setInput = (id: string, value: string) => {
      if (!value) return;
      const input = document.getElementById(id) as HTMLInputElement;
      if (!input) return;
      nativeSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    setInput('branches-modal-name', name);
    setInput('branches-modal-address', address);
    if (phone) setInput('branches-modal-phone', phone);
    if (email) setInput('branches-modal-email', email);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const saveBtn = document.getElementById('branches-modal-save-btn');
    if (!saveBtn) {
      return { id: call.id, success: false, error: 'Save button not found in branch modal' };
    }
    saveBtn.click();

    let branchId = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(name.toLowerCase())) {
          branchId = input.id.replace('branches-row-name-', '');
          break;
        }
      }
      if (branchId) break;
    }

    return {
      id: call.id,
      success: true,
      result: {
        branchId,
        name,
        address,
        phone: phone || '',
        email: email || '',
        message: `Branch "${name}" created successfully.${branchId ? ` ID: ${branchId}` : ''}`,
      },
    };
  }

  executeDeleteBranch(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    return from(this.doDeleteBranch(call));
  }

  private async doDeleteBranch(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { branchId, branchName } = call.arguments;

    for (let i = 0; i < 10; i++) {
      const backdrop = document.querySelector('ngb-modal-backdrop, .modal-backdrop');
      if (!backdrop) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }
    branchHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    let resolvedId = branchId;
    let deleteBtn: HTMLElement | null = null;

    if (branchId) {
      deleteBtn = document.getElementById(`branches-row-delete-${branchId}`);
    }

    if (!deleteBtn) {
      const searchName = branchName || branchId;
      if (searchName) {
        const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
        for (const input of Array.from(nameInputs)) {
          const value = (input as HTMLInputElement).value;
          if (value.toLowerCase().includes(searchName.toLowerCase())) {
            resolvedId = input.id.replace('branches-row-name-', '');
            deleteBtn = document.getElementById(`branches-row-delete-${resolvedId}`);
            break;
          }
        }
      }
    }

    if (!deleteBtn) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (branchId) {
          deleteBtn = document.getElementById(`branches-row-delete-${branchId}`);
          if (deleteBtn) { resolvedId = branchId; break; }
        }
        const searchName = branchName || branchId;
        if (searchName) {
          const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
          for (const input of Array.from(nameInputs)) {
            const value = (input as HTMLInputElement).value;
            if (value.toLowerCase().includes(searchName.toLowerCase())) {
              resolvedId = input.id.replace('branches-row-name-', '');
              deleteBtn = document.getElementById(`branches-row-delete-${resolvedId}`);
              break;
            }
          }
        }
        if (deleteBtn) break;
      }
    }

    if (!deleteBtn) {
      return { id: call.id, success: false, error: `Delete button for branch ${branchName || branchId} not found` };
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
      const stillExists = document.getElementById(`branches-row-name-${resolvedId}`);
      if (!stillExists) {
        return {
          id: call.id,
          success: true,
          result: { branchId: resolvedId, message: `Branch '${branchName || resolvedId}' deleted successfully.` },
        };
      }
    }

    return { id: call.id, success: false, error: `Branch ${branchName || resolvedId} still exists after deletion (10s timeout)` };
  }

  executeListBranches(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    return from(this.doListBranches(call));
  }

  private async doListBranches(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }
    branchHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
    const branches: { id: string; name: string }[] = [];

    for (const input of Array.from(nameInputs)) {
      const inputId = input.id;
      const branchId = inputId.replace('branches-row-name-', '');
      const name = (input as HTMLInputElement).value;
      branches.push({ id: branchId, name });
    }

    const branchList = branches.map(b => `- ${b.name} (ID: ${b.id})`).join('\n');

    return {
      id: call.id,
      success: true,
      result: { branches, count: branches.length, message: `${branches.length} branches found:\n${branchList}` },
    };
  }
}
