import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';

type ContactPayload = {
  contact?: { id?: string; [key: string]: any };
  mainContactPerson?: { id?: string; [key: string]: any };
};

function formatContactLabel(entry: ContactPayload): { label: string; email?: string } {
  const contact = entry?.contact ?? {};
  const person = entry?.mainContactPerson ?? {};
  const first = person.firstName || contact.firstName || '';
  const last = person.lastName || contact.lastName || '';
  const email = person.email || contact.email || '';
  const full = `${first} ${last}`.trim();
  return {
    label: full || email || contact.id || 'Unknown',
    email: email || undefined,
  };
}

export async function getContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this);
  let search = '';
  try {
    search = (this.getNodeParameter('contactSearch', 0) as string) || '';
  } catch {}

  let data: ContactPayload[] = [];

  if (search.trim()) {
    data = (await client.GET('/contact/search', { params: { query: { query: search.trim() } } })) satisfies ContactPayload[];
  } else {
    data = (await client.GET('/contact', { params: { query: { page: 0, pageSize: 25 } } })) satisfies ContactPayload[];
  }

  if (!Array.isArray(data) || !data.length) {
    return [{ name: 'No contacts found', value: '' }];
  }

  return data.map((entry) => {
    const { label, email } = formatContactLabel(entry);
    return {
      name: label,
      value: String(entry?.contact?.id ?? ''),
      description: email,
    };
  });
}
