// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Resolves the start or end base stored on a container template to the address the route works with, like the
 * backend's ContainerBaseAddressResolver: the stored value is matched against the known addresses (company address and
 * branches), first by name and then by address. A stored value that matches no entry (e.g. the city a Klacksy bundle
 * stored) is kept as it is, so the base and the route tools stay available instead of the base being dropped.
 * @param storedBase - The start or end base stored on the template
 * @param addresses - The known addresses offered in the base selects
 * @param selectedBases - The bases currently selected on the page
 */

type ContainerBaseEntry = Readonly<{ name: string; address: string }>;

export function resolveContainerBaseAddress(
  storedBase: string | null | undefined,
  addresses: readonly ContainerBaseEntry[],
): string {
  if (!storedBase) {
    return '';
  }

  const match =
    addresses.find((entry) => entry.name === storedBase) ??
    addresses.find((entry) => entry.address === storedBase);

  return match ? match.address : storedBase;
}

export function unlistedContainerBases(
  selectedBases: readonly string[],
  addresses: readonly ContainerBaseEntry[],
): string[] {
  const listed = new Set(addresses.map((entry) => entry.address));
  return [...new Set(selectedBases.filter((base) => !!base && !listed.has(base)))];
}
