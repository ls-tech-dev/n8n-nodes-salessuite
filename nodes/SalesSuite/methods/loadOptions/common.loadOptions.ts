import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';

type ContactPayload = {
  contact?: { id?: string; [key: string]: any };
  mainContactPerson?: { id?: string; [key: string]: any };
};

type DealPayload = { id?: string; name?: string; pipelineName?: string; phaseName?: string };

type PipelinePayload = { id: string; displayName: string; phases: Array<{ id: string; displayName: string }> };

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

export async function getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this) as any;
  const data = (await client.GET('/pipelines')) as PipelinePayload[];
  return (data ?? []).map((p) => ({ name: p.displayName || p.id, value: p.id }));
}

export async function getStagesByPipeline(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const pipelineId = this.getCurrentNodeParameter('pipelineId') as string;
  if (!pipelineId) return [];

  const client = getApiClient(this);
  const data = (await client.GET('/pipelines')) satisfies PipelinePayload[];
  const pipeline = (data ?? []).find((p) => String(p.id) === String(pipelineId));
  if (!pipeline) return [{ name: 'Pipeline not found', value: '' }];

  return (pipeline.phases ?? []).map((phase) => ({ name: phase.displayName || phase.id, value: phase.id }));
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

export async function getDeals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this) as any;
  const data = (await client.GET('/deal', { params: { query: { page: 0, pageSize: 25 } } })) as DealPayload[];
  if (!Array.isArray(data) || !data.length) {
    return [{ name: 'No deals found', value: '' }];
  }

  return data.map((deal) => {
    const pipeline = deal.pipelineName ? ` • ${deal.pipelineName}` : '';
    const phase = deal.phaseName ? ` › ${deal.phaseName}` : '';
    return {
      name: `${deal.name ?? deal.id}${pipeline}${phase}`,
      value: String(deal.id ?? ''),
      description: deal.pipelineName && deal.phaseName ? `${deal.pipelineName} / ${deal.phaseName}` : undefined,
    };
  });
}
