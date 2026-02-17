import type { ILoadOptionsFunctions, ResourceMapperField, ResourceMapperFields } from 'n8n-workflow';

import { getDisplayName, getTypeDefinition, loadContactFieldData, loadContactProperties, prefixKey } from '../../helpers/fieldMapping';
import { canUsePropertyAsField } from './canUsePropertyAsField';
import { mapTypeToResourceMapper } from './mapTypeToResourceMapper';

function labelWithScope(dynamicDbTableName: string, label: string) {
  const scope = dynamicDbTableName === 'ContactPerson' ? 'Contact Person' : 'Contact';
  return `${scope}: ${label}`;
}

export async function getContactResourceMapperFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
  const data = await loadContactFieldData(this);
  const properties = await loadContactProperties(this);
  const cards = Array.isArray(data?.cards) ? data.cards : [];
  const propertiesById = new Map(properties.map((p) => [p.id, p]));

  const mappedByKey = new Map<string, ResourceMapperField & { group?: string }>();
  const mapped: Array<ResourceMapperField & { group?: string }> = [];

  const addField = (field: any, groupLabel: string) => {
    if (!field?.propertyIdentifier) return;
    if (field.dynamicDbTableName !== 'Contact' && field.dynamicDbTableName !== 'ContactPerson') return;
    if (!canUsePropertyAsField(field)) return;

    const property = propertiesById.get(field.id) ?? field;
    const typeDef = getTypeDefinition(property) ?? getTypeDefinition(field);
    const typeInfo = mapTypeToResourceMapper(typeDef);
    const fieldLabel = getDisplayName(field) || getDisplayName(property);
    const isEmail = field.propertyIdentifier === 'email';
    const key = prefixKey(field.dynamicDbTableName, field.propertyIdentifier);

    if (mappedByKey.has(key)) return;

    const entry = {
      id: key,
      displayName: labelWithScope(field.dynamicDbTableName, fieldLabel),
      required: false,
      canBeUsedToMatch: isEmail && field.dynamicDbTableName === 'ContactPerson',
      defaultMatch: isEmail && field.dynamicDbTableName === 'ContactPerson',
      display: true,
      type: typeInfo.type,
      options: typeInfo.options,
      readOnly: false,
      removed: false,
      group: groupLabel,
      ...typeInfo,
    } as ResourceMapperField & { group?: string };

    mappedByKey.set(key, entry);
    mapped.push(entry);
  };

  if (cards.length > 0) {
    for (const card of cards) {
      const cardLabel = (card.internalCardName || card.displayName || 'Card').toString();
      for (const field of card.propertyDefinitions ?? []) {
        addField(field, cardLabel);
      }
    }
  }

  for (const prop of properties) {
    const key = prefixKey(prop.dynamicDbTableName, prop.propertyIdentifier);
    if (mappedByKey.has(key)) continue;
    addField(prop, 'Other');
  }

  return { fields: mapped };
}

export async function getContactResourceMapperFieldsForUpdate(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
  const res = await getContactResourceMapperFields.call(this);
  res.fields = res.fields.map((f) => ({
    ...f,
    required: false,
    canBeUsedToMatch: false,
    defaultMatch: false,
  }));
  return res;
}
