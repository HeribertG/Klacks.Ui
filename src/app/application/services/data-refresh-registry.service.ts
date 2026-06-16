// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Registry of currently mounted IRefreshable data sources (e.g. settings sub-lists) that the
 * DataRefreshCoordinator reloads when Klacksy mutates their entity. Components register on mount
 * and dispose on destroy, so only visible lists react.
 * @param targets - The set of active refreshable data sources
 */

import { Injectable } from '@angular/core';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';

@Injectable({ providedIn: 'root' })
export class DataRefreshRegistry {
  private readonly targets = new Set<IRefreshable>();

  register(target: IRefreshable): () => void {
    this.targets.add(target);
    return () => {
      this.targets.delete(target);
    };
  }

  matching(entityTypes: readonly string[]): IRefreshable[] {
    return [...this.targets].filter((t) =>
      t.refreshableEntities.some((e) => entityTypes.includes(e)),
    );
  }
}
