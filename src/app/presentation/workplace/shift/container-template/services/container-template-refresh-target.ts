// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Refresh target the container template page registers with the DataRefreshRegistry while it is open, so a
 * Klacksy skill that changes container templates reloads the page. It exposes the page's dirty check and save as
 * ISaveable, which makes the DataRefreshCoordinator ask before a reload would discard unsaved edits.
 * @param hooks - Dirty check, save and reload of the running editing session
 */
import { IRefreshable } from 'src/app/domain/interfaces/refreshable.interface';
import { ISaveable } from 'src/app/domain/interfaces/manageable.interface';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';
import { ContainerTemplateRefreshHooks } from './container-template-refresh-hooks.interface';

export class ContainerTemplateRefreshTarget implements IRefreshable, ISaveable {
  readonly refreshableEntities = RefreshEntityTokens.CONTAINER_TEMPLATE;

  constructor(private readonly hooks: ContainerTemplateRefreshHooks) {}

  reload(): void {
    this.hooks.reload();
  }

  areObjectsDirty(): boolean {
    return this.hooks.isDirty();
  }

  save(): void {
    this.hooks.save();
  }
}
