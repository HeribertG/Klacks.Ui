// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Channel through which application services ask for a page reload: a newer deployed version, the
 * end of a backend outage, or a chunk of the running bundle that is gone. The presentation layer
 * observes requests$ and decides whether and when the reload happens, so no application service
 * ever reloads the page itself.
 * @param request - Reason, optional target URL and whether an automatic reload is allowed
 */
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';

@Injectable({
  providedIn: 'root',
})
export class AppReloadRequestService {
  private readonly requests = new Subject<IAppReloadRequest>();

  readonly requests$ = this.requests.asObservable();

  requestReload(request: IAppReloadRequest): void {
    this.requests.next(request);
  }
}
