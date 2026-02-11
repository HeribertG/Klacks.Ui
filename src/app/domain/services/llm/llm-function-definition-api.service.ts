import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ILlmFunctionDefinitionDto } from '../../interfaces/llm-function-definitions.interface';

@Injectable({
  providedIn: 'root',
})
export class LlmFunctionDefinitionApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}api/backend/assistant/chat`;

  loadFunctionDefinitions(): Observable<ILlmFunctionDefinitionDto[]> {
    return this.http
      .get<ILlmFunctionDefinitionDto[]>(`${this.baseUrl}/function-definitions`)
      .pipe(retry(3));
  }
}
