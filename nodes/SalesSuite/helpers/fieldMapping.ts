import { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import type { DataValueWithMessages } from '@poc/common/data-type-conversion';
import { type ContentValue, type DynamicDbTableName, type TypeDefinition } from '@poc/common/property-definition';

import { canUsePropertyAsField } from '../methods/resourceMappers/canUsePropertyAsField';
import { getApiClient } from './apiclient';

function assertUnreachable(x: never, errorMessage?: string): never {
  errorMessage ||= `Didn't expect to get here. Unexpected value ${JSON.stringify(x)}`;
  throw new Error(errorMessage);
}

function createDataFixerForTypeDefinition(typeDef: TypeDefinition) {
  return (input: unknown): DataValueWithMessages<ContentValue> => {
    const type = typeDef.type;
    switch (type) {
      case 'boolean':
        return {
          value: typeof input === 'boolean' ? input : Boolean(input),
          messages: [],
        };
      case 'number':
        return {
          value: typeof input === 'number' ? input : Number(input),
          messages: [],
        };
      case 'string':
        return {
          value: typeof input === 'string' ? input : String(input),
          messages: [],
        };
      case 'dateTime':
        return {
          value: typeof input === 'string' ? new Date(input) : input instanceof Date ? input : new Date(String(input)),
          messages: [],
        };
      case 'select': {
        // always return string array
        const value = Array.isArray(input) ? input.map(String) : [String(input)];
        return {
          value: value,
          messages: [],
        };
      }
      default:
        assertUnreachable(type);
    }
  };
}

export const TABLE_PREFIX: Record<DynamicDbTableName, string> = {
  Contact: 'contact',
  ContactPerson: 'contactPerson',
  Deal: 'deal',
};

export function prefixKey(tableName: DynamicDbTableName, key: string) {
  return `${TABLE_PREFIX[tableName]}.${key}`;
}

export type ApiPropertyDefinition = {
  id: string;
  propertyIdentifier: string;
  dynamicDbTableName: DynamicDbTableName;
  required?: boolean | null;
  dynamicTypeDefinition?: {
    fieldName?: string;
    shortName?: string;
    description?: string | null;
    type?: TypeDefinition | null;
  } | null;
  typeDefinition?: TypeDefinition | null;
  resolvedPropertyDefinition?: {
    propertyInfo?: {
      fieldNameTranslationKey?: string;
    } | null;
  } | null;
};

export type FieldApiResponse = {
  properties: ApiPropertyDefinition[];
  cards?: Array<{
    id: string;
    displayName?: string | null;
    internalCardName?: string | null;
    propertyDefinitions: ApiPropertyDefinition[];
  }>;
};

export async function loadContactFieldData(ctx: ILoadOptionsFunctions | IExecuteFunctions): Promise<FieldApiResponse> {
  const client = getApiClient(ctx as any) as any;
  return await client.GET('/fields/contact');
}

export async function loadContactProperties(ctx: ILoadOptionsFunctions | IExecuteFunctions): Promise<ApiPropertyDefinition[]> {
  const data = await loadContactFieldData(ctx);
  const props = Array.isArray(data?.properties) ? data.properties : [];
  return props.filter((p) => (p.dynamicDbTableName === 'Contact' || p.dynamicDbTableName === 'ContactPerson') && canUsePropertyAsField(p));
}

export async function loadDealFieldData(ctx: ILoadOptionsFunctions | IExecuteFunctions): Promise<FieldApiResponse> {
  const client = getApiClient(ctx as any) as any;
  return await client.GET('/fields/deal');
}

export async function loadDealProperties(ctx: ILoadOptionsFunctions | IExecuteFunctions): Promise<ApiPropertyDefinition[]> {
  const data = await loadDealFieldData(ctx);
  const props = Array.isArray(data?.properties) ? data.properties : [];
  return props.filter((p) => p.dynamicDbTableName === 'Deal' && canUsePropertyAsField(p));
}

export function getTypeDefinition(prop: ApiPropertyDefinition): TypeDefinition | undefined {
  return (prop.typeDefinition ?? prop.dynamicTypeDefinition?.type ?? undefined) as TypeDefinition | undefined;
}

export function getDisplayName(prop: ApiPropertyDefinition): string {
  return prop.dynamicTypeDefinition?.fieldName || prop.propertyIdentifier;
}

export function buildTypeMap(properties: ApiPropertyDefinition[]): Map<string, TypeDefinition | undefined> {
  const map = new Map<string, TypeDefinition | undefined>();
  for (const prop of properties) {
    const key = prefixKey(prop.dynamicDbTableName, prop.propertyIdentifier);
    map.set(key, getTypeDefinition(prop));
  }
  return map;
}

export function normalizeValue(value: unknown, typeDef?: TypeDefinition): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;

  if (!typeDef) return value;

  const fixedValue = createDataFixerForTypeDefinition(typeDef)(value);

  return fixedValue.value;
}

export function splitPrefixedFields(input: IDataObject) {
  const contact: IDataObject = {};
  const contactPerson: IDataObject = {};
  const deal: IDataObject = {};

  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('contact.')) {
      contact[key.slice('contact.'.length)] = value;
      continue;
    }
    if (key.startsWith('contactPerson.')) {
      contactPerson[key.slice('contactPerson.'.length)] = value;
      continue;
    }
    if (key.startsWith('deal.')) {
      deal[key.slice('deal.'.length)] = value;
      continue;
    }
    contact[key] = value;
  }

  return { contact, contactPerson, deal };
}
