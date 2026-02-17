import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';
import { getDisplayName, loadContactProperties, loadDealProperties } from '../../helpers/fieldMapping';

type SubscriptionPayload = {
  id: string;
  hookUrl: string;
  type: string;
};

type FormPayload = { formId: string; name: string };

const WEBHOOK_TYPES: Array<{ name: string; value: string; description?: string }> = [
  { name: 'Contact Created', value: 'contact.created' },
  { name: 'Contact Property Changed', value: 'contact.propertyChanged' },
  { name: 'Deal Created', value: 'deal.created' },
  { name: 'Deal Property Changed', value: 'deal.propertyChanged' },
  { name: 'Deal Stage Changed', value: 'deal.stageChanged' },
  { name: 'Form Submitted', value: 'form.submitted' },
  { name: 'Activity Created', value: 'activity.created' },
];

export async function getWebhookTriggers(this: ILoadOptionsFunctions) {
  return WEBHOOK_TYPES;
}

export async function getWebhooksAsOptions(this: ILoadOptionsFunctions) {
  const client = getApiClient(this) as any;
  const list = (await client.GET('/webhooks/subscription')) as SubscriptionPayload[];
  if (!Array.isArray(list) || !list.length) return [{ name: 'No Webhooks Found', value: '' }];
  return list.map((w) => ({
    name: `${w.hookUrl} (${w.type})`,
    value: w.id,
  }));
}

export async function getFormsAsOptions(this: ILoadOptionsFunctions) {
  const client = getApiClient(this) as any;
  const list = (await client.GET('/form')) as FormPayload[];
  return list.length ? list.map((f) => ({ name: f.name || f.formId, value: f.formId })) : [{ name: 'No Forms Found', value: '' }];
}

export async function getWebhookProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const trigger = this.getCurrentNodeParameter('triggers') as string | undefined;
  if (!trigger) {
    return [{ name: 'Select a Trigger First', value: '' }];
  }

  if (trigger === 'contact.propertyChanged') {
    const properties = await loadContactProperties(this);

    const opts = properties
      .filter((p) => p.dynamicDbTableName === 'Contact' || p.dynamicDbTableName === 'ContactPerson')
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'en', { sensitivity: 'base' }))
      .map((p) => ({ name: getDisplayName(p), value: p.propertyIdentifier }));
    return opts.length ? opts : [{ name: 'No Properties Found', value: '' }];
  }

  if (trigger === 'deal.propertyChanged') {
    const properties = await loadDealProperties(this);
    const opts = properties
      .filter((p) => p.dynamicDbTableName === 'Deal')
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'en', { sensitivity: 'base' }))
      .map((p) => ({ name: getDisplayName(p), value: p.propertyIdentifier }));
    return opts.length ? opts : [{ name: 'No Properties Found', value: '' }];
  }

  return [{ name: 'No properties required for this trigger', value: '' }];
}
