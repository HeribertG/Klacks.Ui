// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
    
    // Handle both old query parameter format (?id=) and new path parameter format (/id)
    let isValidRoute = false;
    let hasId = false;
    let id: string | undefined = undefined;
    
    // Check for new path parameter format: /workplace/edit-address/123
    if (tmpUrl.startsWith(expectedRoute + '/')) {
      const pathSegments = tmpUrl.split('/');
      const expectedSegments = expectedRoute.split('/');
      
      // Check if the base route matches
      if (pathSegments.length > expectedSegments.length) {
        const baseRouteMatches = expectedSegments.every((segment, index) => 
          pathSegments[index] === segment
        );
        
        if (baseRouteMatches) {
          isValidRoute = true;
          const idSegment = pathSegments[expectedSegments.length];
          hasId = Boolean(idSegment && idSegment.trim() !== '');
          id = hasId ? idSegment : undefined;
        }
      }
    }
    // Fallback to old query parameter format: /workplace/edit-address?id=123
    else if (tmpUrl.includes('?id=')) {
      const res = tmpUrl.replace('?id=', ';').split(';');
      isValidRoute = res.length === 2 && res[0] === expectedRoute;
      hasId = Boolean(isValidRoute && res[1] && res[1].trim() !== '');
      id = hasId ? res[1] : undefined;
    }
    // Check for exact route match without ID
    else if (tmpUrl === expectedRoute) {
      isValidRoute = true;
      hasId = false;
      id = undefined;
    }

    return {
      hasId: hasId,
      id: id,
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
