import type { ResourceMapperField } from 'n8n-workflow';

import type { TypeDefinition, TypeDefinitionSelect } from '@poc/common/property-definition';

export function mapTypeToResourceMapper(typeDef?: TypeDefinition): Partial<ResourceMapperField> {
  if (!typeDef) return { type: 'string' };

  if (typeDef.type === 'boolean') {
    return {
      type: 'options',
      options: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    };
  }

  if (typeDef.type === 'number') {
    return { type: 'number' };
  }

  if (typeDef.type === 'dateTime') {
    return { type: 'dateTime' };
  }

  if (typeDef.type === 'select') {
    const select = typeDef as TypeDefinitionSelect;
    const options = select.options?.map((opt) => ({ name: opt.label, value: opt.key }));
    if (select.variant === 'multi') {
      return { type: 'multiOptions' as any, options };
    }
    return { type: 'options', options };
  }

  return { type: 'string' };
}
