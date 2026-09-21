// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Wraps the infrastructure API services for standing approvals so the presentation layer never talks
 * to HTTP directly; also offers the selectable groups as a flat id/name list.
 */
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DataStandingApprovalService } from 'src/app/infrastructure/api/assistant/data-standing-approval.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { IStandingApproval } from 'src/app/domain/models/assistant/standing-approval.interface';
import { IGrantStandingApprovalRequest } from 'src/app/domain/models/assistant/grant-standing-approval-request.interface';
import { IStandingApprovalGroupOption } from 'src/app/domain/models/assistant/standing-approval-group-option.interface';

@Injectable({ providedIn: 'root' })
export class StandingApprovalService {
  private dataStandingApprovalService = inject(DataStandingApprovalService);
  private dataGroupService = inject(DataGroupService);

  getAll(): Observable<IStandingApproval[]> {
    return this.dataStandingApprovalService.getAll();
  }

  grant(request: IGrantStandingApprovalRequest): Observable<IStandingApproval> {
    return this.dataStandingApprovalService.grant(request);
  }

  revoke(id: string): Observable<void> {
    return this.dataStandingApprovalService.revoke(id);
  }

  getGroupOptions(): Observable<IStandingApprovalGroupOption[]> {
    return this.dataGroupService.getGroupTree().pipe(
      map((tree) =>
        tree.nodes
          .filter((node): node is typeof node & { id: string } => !!node.id)
          .map((node) => ({ id: node.id, name: node.name }))
      )
    );
  }
}
