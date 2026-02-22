// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { appConfig } from './app/app.config';

enableProdMode();

bootstrapApplication(AppComponent, {...appConfig, providers: [provideZoneChangeDetection(), ...appConfig.providers]})
  .catch((err) => console.error(err));
