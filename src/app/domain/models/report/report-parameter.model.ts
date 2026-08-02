// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Parameters a report asks for when it is executed.
 * Their values are available to row filters and formulas, and can optionally be bound
 * to one of the query arguments the data providers already accept.
 * @param key - Identifier, exposed to scripts as param_<key>
 * @param bindsTo - Query argument the value is passed to, if any
 */

export interface ReportParameter {
  key: string;
  label: string;
  type: ReportParameterType;
  required?: boolean;
  defaultValue?: string;
  choices?: string[];
  bindsTo?: ReportParameterBinding;
}

export enum ReportParameterType {
  Text = 0,
  Number = 1,
  Date = 2,
  Boolean = 3,
  Choice = 4,
}

export enum ReportParameterBinding {
  None = 0,
  GroupId = 1,
  ClientId = 2,
  StartDate = 3,
  EndDate = 4,
}

export type ReportParameterValues = Record<string, string>;
