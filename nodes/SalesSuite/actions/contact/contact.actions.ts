import { ApplicationError, IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';
import { buildTypeMap, loadContactProperties, normalizeValue, splitPrefixedFields } from '../../helpers/fieldMapping';
import { createNoteWithOptionalPin } from '../../helpers/notes';

async function sanitizeContactPayload(
  this: IExecuteFunctions,
  raw: unknown
): Promise<{
  contact: any;
  contactPerson: any;
}> {
  const maybe = (raw ?? {}) as IDataObject;
  const val = (maybe.value ?? maybe) as IDataObject;

  const { contact, contactPerson } = splitPrefixedFields(val);
  const properties = await loadContactProperties(this);
  const typeMap = buildTypeMap(properties);

  const sanitize = (input: IDataObject, prefix: 'contact' | 'contactPerson') => {
    const out: IDataObject = {};
    for (const [key, value] of Object.entries(input)) {
      const typeDef = typeMap.get(`${prefix}.${key}`);
      const normalized = normalizeValue(value, typeDef);
      if (normalized === undefined) continue;
      out[key] = normalized;
    }
    return out;
  };

  return {
    contact: sanitize(contact, 'contact'),
    contactPerson: sanitize(contactPerson, 'contactPerson'),
  };
}

function pickEmail(payload: { contact: IDataObject; contactPerson: IDataObject }): string {
  const email = payload.contactPerson?.email ?? payload.contact?.email;
  return String(email ?? '').trim();
}

export async function handleContact(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
  const client = getApiClient(this);
  switch (operation) {
    case 'createContact': {
      const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
      const payload = await sanitizeContactPayload.call(this, fieldsParam);

      const email = pickEmail(payload);
      if (!email) {
        throw new ApplicationError('Create Contact requires at least an email (contactPerson.email or contact.email).');
      }

      const result = await client.POST('/contact/create', {
        body: payload,
      });

      const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
      const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
      let initialNoteId: string | undefined;
      if (createInitialNote && result?.contact?.id) {
        const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
        const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
        if (initialNoteText && initialNoteText.trim()) {
          initialNoteId = await createNoteWithOptionalPin(this, result.contact.id as string, initialNoteText, pinInitialNote, makeBold, 'contact');
        }
      }

      return { ...(result ?? {}), inputData: payload, initialNoteId };
    }

    case 'updateContact': {
      const contactId = this.getNodeParameter('contactId', i) as string;
      if (!contactId) throw new ApplicationError('updateContact requires a contactId.');

      const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
      const payload = await sanitizeContactPayload.call(this, fieldsParam);

      const allowChangeEmail = this.getNodeParameter('allowChangeEmail', i, false) as boolean;
      if (!allowChangeEmail) {
        delete (payload.contact as any)?.email;
        delete (payload.contactPerson as any)?.email;
      }

      const hasFields = Object.keys(payload.contact).length > 0 || Object.keys(payload.contactPerson).length > 0;
      if (!hasFields) {
        throw new ApplicationError('No fields provided to update.');
      }

      const appendMultiSelectValues = this.getNodeParameter('appendMultiSelectValues', i, false) as boolean;

      const result = await client.PATCH(`/contact/{id}`, {
        params: {
          query: { appendMultiSelectValues },
          path: { id: contactId },
        },
        body: payload as any,
      });

      const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
      const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
      let initialNoteId: string | undefined;
      if (createInitialNote) {
        const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
        const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
        if (initialNoteText && initialNoteText.trim()) {
          initialNoteId = await createNoteWithOptionalPin(this, contactId, initialNoteText, pinInitialNote, makeBold, 'contact');
        }
      }

      return { ...(result ?? {}), inputData: payload, initialNoteId };
    }

    case 'upsertContact': {
      const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
      const payload = await sanitizeContactPayload.call(this, fieldsParam);

      const email = pickEmail(payload);
      if (!email) {
        throw new ApplicationError('Upsert requires an email (contactPerson.email or contact.email).');
      }

      const lookup = (await client.GET('/contact/by-email', {
        params: { query: { email } },
      })) as Array<any>;

      const existing = Array.isArray(lookup) ? lookup[0] : null;
      const contactId = existing?.contact?.id as string | undefined;

      if (contactId) {
        const appendMultiSelectValues = this.getNodeParameter('appendMultiSelectValues', i, false) as boolean;
        const result = await client.PATCH(`/contact/{id}`, {
          params: { query: { appendMultiSelectValues }, path: { id: contactId } },
          body: payload as any,
        });
        return { mode: 'found-and-updated', ...(result ?? {}), inputData: payload };
      }

      const created = await client.POST('/contact/create', {
        body: payload,
      });

      return { mode: 'created-new', ...(created ?? {}), inputData: payload };
    }

    case 'getByEmail': {
      const email = this.getNodeParameter('email', i) as string;
      const data = await client.GET('/contact/by-email', {
        params: { query: { email } },
      });
      return { email, contacts: data ?? [] };
    }

    case 'getContactById': {
      const contactId = this.getNodeParameter('contactId', i) as string;
      const data = await client.GET(`/contact/{contactId}`, {
        params: { path: { contactId: contactId } },
      });
      return { contactId, contact: data ?? null };
    }

    case 'searchContacts': {
      const searchString = this.getNodeParameter('searchString', i, '') as string;
      if (!searchString.trim()) {
        throw new ApplicationError('Search requires a query string.');
      }
      const data = await client.GET('/contact/search', {
        params: { query: { query: searchString.trim() } },
      });
      return { searchString, contacts: data ?? [] };
    }

    case 'listContacts': {
      const page = this.getNodeParameter('page', i, 0) as number;
      const pageSize = this.getNodeParameter('pageSize', i, 25) as number;
      const data = await client.GET('/contact', {
        params: { query: { page, pageSize } },
      });
      return { page, pageSize, contacts: data ?? [] };
    }

    default:
      throw new ApplicationError(`Unsupported contact operation: ${operation}`);
  }
}
