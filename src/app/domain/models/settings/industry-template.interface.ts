// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Preview payload for one industry preset, shown when a settings card user expands an
 * industry option to see what it would bring along before selecting it.
 * @param industry - The industry slug this template describes
 * @param schedulingRules - Scheduling rules shipped with this industry preset
 * @param qualifications - Qualifications shipped with this industry preset
 */
import { IIndustryTemplateSchedulingRuleEntry } from 'src/app/domain/models/settings/industry-template-scheduling-rule-entry.interface';
import { IIndustryTemplateQualificationEntry } from 'src/app/domain/models/settings/industry-template-qualification-entry.interface';

export interface IIndustryTemplate {
  industry: string;
  schedulingRules: IIndustryTemplateSchedulingRuleEntry[];
  qualifications: IIndustryTemplateQualificationEntry[];
}
