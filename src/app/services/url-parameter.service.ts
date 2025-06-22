import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface UrlParseResult {
  hasId: boolean;
  id: string | undefined;
  isValidRoute: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UrlParameterService {
  private router = inject(Router);

  parseCurrentUrl(expectedRoute: string): UrlParseResult {
    const tmpUrl = this.router.url;
    const res = tmpUrl.replace('?id=', ';').split(';');

    const isValidRoute = res.length === 2 && res[0] === expectedRoute;
    const hasId = Boolean(isValidRoute && res[1] && res[1].trim() !== '');

    return {
      hasId: hasId,
      id: hasId ? res[1] : undefined,
      isValidRoute: isValidRoute,
    };
  }

  getWorkplaceSubRoute(): string {
    const tmpUrl = this.router.url;
    const urlWithoutQuery = tmpUrl.split('?')[0];
    const workplaceIndex = urlWithoutQuery.indexOf('/workplace/');

    if (workplaceIndex !== -1) {
      return urlWithoutQuery.substring(workplaceIndex + '/workplace/'.length);
    }

    return '';
  }
}
