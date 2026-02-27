// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SpamRuleService } from 'src/app/domain/services/email/spam-rule.service';
import {
  ISpamRule,
  SpamRuleType,
  SPAM_RULE_TYPE_LABELS,
} from 'src/app/domain/models/email/spam-rule.model';

const SPAM_RULE_TYPES = [
  SpamRuleType.SenderContains,
  SpamRuleType.SenderDomain,
  SpamRuleType.SubjectContains,
  SpamRuleType.BodyContains,
];

@Component({
  selector: 'app-spam-rules',
  templateUrl: './spam-rules.component.html',
  styleUrls: ['./spam-rules.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, FormsModule],
})
export class SpamRulesComponent implements OnInit {
  protected spamRuleService = inject(SpamRuleService);

  protected ruleTypes = SPAM_RULE_TYPES;
  protected ruleTypeLabels = SPAM_RULE_TYPE_LABELS;
  protected newRuleType: SpamRuleType = SpamRuleType.SenderContains;
  protected newPattern = '';

  ngOnInit(): void {
    this.spamRuleService.loadRules();
  }

  addRule(): void {
    const trimmed = this.newPattern.trim();
    if (!trimmed) {
      return;
    }
    this.spamRuleService.createRule(this.newRuleType, trimmed);
    this.newPattern = '';
  }

  toggleActive(rule: ISpamRule): void {
    this.spamRuleService.toggleActive(rule);
  }

  deleteRule(id: string): void {
    this.spamRuleService.deleteRule(id);
  }
}
