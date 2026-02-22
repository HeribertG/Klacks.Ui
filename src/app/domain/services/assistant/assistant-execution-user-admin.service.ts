// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { IAssistantFunctionCall, IAssistantFunctionResult } from '../../interfaces/assistant-function-definitions.interface';
import { waitForElement } from './assistant-execution-utils';

@Injectable()
export class AssistantExecutionUserAdminService {

  executeCreateSystemUser(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doCreateSystemUser(call));
  }

  private async doCreateSystemUser(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    const { firstName, lastName, email } = call.arguments;

    let userAdminSection = document.getElementById('settings-user-administration');
    if (!userAdminSection) {
      document.getElementById('open-settings')?.click();
      userAdminSection = await waitForElement('settings-user-administration', 5000);
      if (!userAdminSection) {
        return { id: call.id, success: false, error: 'User administration section not loaded' };
      }
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    document.getElementById('user-admin-add-user-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 1500));

    const modalForm = document.getElementById('user-admin-modal-form');
    if (!modalForm) {
      return { id: call.id, success: false, error: 'User creation modal did not open' };
    }

    const userAdminEl = document.querySelector('app-user-administration');
    const ngGetComponent = (window as any).ng?.getComponent;
    const component = ngGetComponent ? ngGetComponent(userAdminEl) : null;

    if (component?.formModel) {
      component.formModel.set({ firstName, lastName, userName: '', email });
      component.onNameChange();
    } else {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;

      const setAngularInput = (id: string, value: string) => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (!input) return;
        input.focus();
        nativeSetter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setAngularInput('user-firstname', firstName);
      await new Promise(resolve => setTimeout(resolve, 500));
      setAngularInput('user-name', lastName);
      await new Promise(resolve => setTimeout(resolve, 500));
      document.getElementById('user-firstname')?.dispatchEvent(new FocusEvent('blur'));
      document.getElementById('user-name')?.dispatchEvent(new FocusEvent('blur'));
      setAngularInput('setting-user-email', email);
    }

    let username = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const el = document.getElementById('user-userName') as HTMLInputElement;
      username = el?.value || '';
      if (username) break;
    }

    const saveBtn = document.getElementById('user-admin-modal-save-btn') as HTMLButtonElement;
    if (!saveBtn || saveBtn.disabled) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (saveBtn && !saveBtn.disabled) break;
      }
    }

    if (saveBtn?.disabled) {
      return {
        id: call.id,
        success: false,
        error: `Form not valid. Username: '${username}', formModel may not have synced.`,
      };
    }

    let password = '';
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLTextAreaElement && node.value?.includes('Password:')) {
            const match = node.value.match(/Password:\s*(.+)/);
            if (match) password = match[1].trim();
          }
        }
      }
    });
    observer.observe(document.body, { childList: true });

    saveBtn?.click();
    await new Promise(resolve => setTimeout(resolve, 3000));

    observer.disconnect();

    let userId = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const nameInputs = document.querySelectorAll('input[id^="user-admin-row-name-"]');
      const fullName = `${firstName} ${lastName}`;
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(fullName.toLowerCase())) {
          userId = input.id.replace('user-admin-row-name-', '');
          break;
        }
      }
      if (userId) break;
    }

    if (!userId) {
      return {
        id: call.id,
        success: false,
        error: `User '${firstName} ${lastName}' could not be created. Username: '${username}'`,
      };
    }

    return {
      id: call.id,
      success: true,
      result: {
        userId,
        username: username || '',
        password: password || '',
        firstName,
        lastName,
        email,
        message: `User '${firstName} ${lastName}' created successfully. User-ID: ${userId}` +
          (username ? ` | Username: ${username}` : '') +
          (password ? ` | Password: ${password}` : ''),
      },
    };
  }

  executeDeleteSystemUser(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doDeleteSystemUser(call));
  }

  private async doDeleteSystemUser(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    let { userId } = call.arguments;
    const { firstName, lastName } = call.arguments;

    for (let i = 0; i < 10; i++) {
      const backdrop = document.querySelector('ngb-modal-backdrop, .modal-backdrop');
      if (!backdrop) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    document.getElementById('open-settings')?.click();
    const userAdminSection = await waitForElement('settings-user-administration', 8000);
    if (!userAdminSection) {
      return { id: call.id, success: false, error: 'User administration section not loaded' };
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!userId && firstName && lastName) {
      const fullName = `${firstName} ${lastName}`;
      const nameInputs = document.querySelectorAll('input[id^="user-admin-row-name-"]');
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(fullName.toLowerCase())) {
          userId = input.id.replace('user-admin-row-name-', '');
          break;
        }
      }
      if (!userId) {
        return { id: call.id, success: false, error: `User '${fullName}' not found in user list` };
      }
    }

    let deleteBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      deleteBtn = document.getElementById(`user-admin-row-delete-${userId}`);
      if (deleteBtn) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!deleteBtn) {
      return { id: call.id, success: false, error: `Delete button for user ${userId} not found` };
    }
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
      const stillExists = document.getElementById(`user-admin-row-name-${userId}`);
      if (!stillExists) {
        return {
          id: call.id,
          success: true,
          result: { userId, message: `User with ID ${userId} deleted successfully.` },
        };
      }
    }

    return { id: call.id, success: false, error: `User ${userId} still exists after deletion (10s timeout)` };
  }

  executeListSystemUsers(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doListSystemUsers(call));
  }

  private async doListSystemUsers(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    let userAdminSection = document.getElementById('settings-user-administration');
    if (!userAdminSection) {
      document.getElementById('open-settings')?.click();
      userAdminSection = await waitForElement('settings-user-administration', 5000);
      if (!userAdminSection) {
        return { id: call.id, success: false, error: 'User administration section not loaded' };
      }
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInputs = document.querySelectorAll('input[id^="user-admin-row-name-"]');
    const users: { id: string; name: string; email: string }[] = [];

    for (const input of Array.from(nameInputs)) {
      const inputId = input.id;
      const userId = inputId.replace('user-admin-row-name-', '');
      const name = (input as HTMLInputElement).value;
      const emailInput = document.getElementById(`user-admin-row-email-${userId}`) as HTMLInputElement;
      const email = emailInput?.value || '';
      users.push({ id: userId, name, email });
    }

    const userList = users.map(u => `- ${u.name} (${u.email})`).join('\n');

    return {
      id: call.id,
      success: true,
      result: { users, count: users.length, message: `${users.length} users found:\n${userList}` },
    };
  }

  executeSetUserGroupScope(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    return from(this.doSetUserGroupScope(call));
  }

  private async doSetUserGroupScope(call: IAssistantFunctionCall): Promise<IAssistantFunctionResult> {
    const { userId, groupNames } = call.arguments;

    document.getElementById('open-settings')?.click();
    const groupScopeSection = await waitForElement('settings-group-scope', 5000);
    if (!groupScopeSection) {
      return { id: call.id, success: false, error: 'Group scope section not loaded' };
    }
    groupScopeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const countBtnId = `group-scope-row-count-btn-${userId}`;
    const countBtn = await waitForElement(countBtnId, 3000);
    if (!countBtn) {
      return { id: call.id, success: false, error: `User with ID ${userId} not found in group scope list` };
    }
    countBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const requestedGroups = groupNames.split(',').map((g: string) => g.trim());
    const assignedGroups: string[] = [];

    const allLabels = document.querySelectorAll('[id^="group-scope-modal-group-label-"]');
    for (const label of Array.from(allLabels)) {
      const labelText = label.textContent?.trim() || '';
      for (const groupName of requestedGroups) {
        if (labelText.toLowerCase() === groupName.toLowerCase()) {
          const groupId = label.id.replace('group-scope-modal-group-label-', '');
          const checkbox = document.getElementById(`group-${groupId}`) as HTMLInputElement;
          if (checkbox && !checkbox.checked) {
            checkbox.click();
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          assignedGroups.push(labelText);
        }
      }
    }

    if (assignedGroups.length === 0) {
      return {
        id: call.id,
        success: false,
        error: `None of the requested groups found: ${groupNames}`,
      };
    }

    document.getElementById('group-scope-modal-save-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      id: call.id,
      success: true,
      result: {
        userId,
        assignedGroups,
        message: `Group scope set to: ${assignedGroups.join(', ')}`,
      },
    };
  }
}
