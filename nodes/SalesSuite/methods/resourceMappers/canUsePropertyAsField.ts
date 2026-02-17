/* eslint-disable */
import type { DynamicDbTableName } from '@poc/common/property-definition';

import type { ApiPropertyDefinition } from '../../helpers/fieldMapping';

const systemPropertyDefinitionsByDynamicTable = {
  Contact: ['lastContactedAt', 'lastContactedBy', 'lastReachedAt', 'lastReachedBy', 'deciderLastReachedAt', 'deciderLastReachedBy', 'createdAt', 'createdBy', 'updatedBy', 'updatedAt', 'callCount'],
  ContactPerson: ['lastContactedAt', 'lastContactedBy', 'lastReachedAt', 'lastReachedBy', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
  Deal: ['lastContactedAt', 'lastContactedBy', 'createdAt', 'lastReachedAt', 'lastReachedBy', 'deciderLastReachedAt', 'deciderLastReachedBy', 'createdBy', 'updatedAt', 'updatedBy', 'callCount'],
} as const satisfies Record<DynamicDbTableName, string[]>;

function isSystemFieldDisabledInDrawer(tableName: DynamicDbTableName, propertyIdentifier: string) {
  const definitions = systemPropertyDefinitionsByDynamicTable as Record<DynamicDbTableName, string[]>;
  return !definitions[tableName]?.includes(propertyIdentifier);
}

export function canUsePropertyAsField(property: ApiPropertyDefinition): boolean {
  try {
    if (isSystemFieldDisabledInDrawer(property.dynamicDbTableName, property.propertyIdentifier)) return false;
  } catch {}
  return true;
}
