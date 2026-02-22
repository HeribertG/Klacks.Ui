// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IAssistantFunctionDefinitionDto } from '../../interfaces/assistant-function-definitions.interface';

@Injectable({
  providedIn: 'root',
})
export class AssistantFunctionDefinitionApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}assistant/chat`;

  loadFunctionDefinitions(): Observable<IAssistantFunctionDefinitionDto[]> {
    return this.http
      .get<IAssistantFunctionDefinitionDto[]>(`${this.baseUrl}/function-definitions`)
      .pipe(retry(3));
  }
}
