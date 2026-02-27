// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { DataSpamRuleService } from 'src/app/infrastructure/api/email/data-spam-rule.service';
import { ISpamRule, SpamRuleType } from 'src/app/domain/models/email/spam-rule.model';

@Injectable({
  providedIn: 'root',
})
export class SpamRuleService {
  private dataService = inject(DataSpamRuleService);

  rules = signal<ISpamRule[]>([]);
  isLoading = signal(false);

  loadRules(): void {
    this.isLoading.set(true);
    this.dataService.getAll().subscribe({
      next: (rules) => {
        this.rules.set(rules);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  createRule(ruleType: SpamRuleType, pattern: string): void {
    this.dataService.create(ruleType, pattern).subscribe({
      next: (rule) => {
        this.rules.update((list) => [...list, rule]);
      },
    });
  }

  toggleActive(rule: ISpamRule): void {
    const updated = { ...rule, isActive: !rule.isActive };
    this.dataService.update(updated).subscribe({
      next: (result) => {
        this.rules.update((list) =>
          list.map((r) => (r.id === result.id ? result : r)),
        );
      },
    });
  }

  deleteRule(id: string): void {
    this.dataService.delete(id).subscribe({
      next: () => {
        this.rules.update((list) => list.filter((r) => r.id !== id));
      },
    });
  }
}
