// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export function formatClientDisplayName(client: {
  idNumber?: number;
  firstName?: string;
  name?: string;
  company?: string;
  legalEntity?: boolean;
}): string {
  if (client.legalEntity && client.company) {
    return client.company;
  }
  const nameParts: string[] = [];
  if (client.firstName) nameParts.push(client.firstName);
  if (client.name) nameParts.push(client.name);
  const fullName = nameParts.join(' ');
  if (client.idNumber && fullName) {
    return `${client.idNumber}, ${fullName}`;
  }
  return fullName || (client.idNumber ? String(client.idNumber) : '') || client.company || '';
}
