// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Defines the structure for toast notifications including interactive reply toasts.
 * @param IToast - Base toast with display properties and optional interactive options
 * @param IInteractiveToastConfig - Configuration for single/multi-select interactive toasts
 */

import { TemplateRef } from '@angular/core';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';

export interface IToast {
  id: string;
  textOrTpl: string | TemplateRef<unknown>;
  classname?: string;
  delay?: number;
  name?: string;
  autohide?: boolean;
  headertext?: string;
  showTextField?: boolean;
  textFieldValue?: string;
  icon?: string;
  interactive?: IInteractiveToastConfig;
}

export interface IInteractiveToastConfig {
  repliesConfig: ISuggestedRepliesConfig;
  onSelected: (values: string[]) => void;
  onDismissed?: () => void;
}
