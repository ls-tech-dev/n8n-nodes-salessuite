import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';
import { getDisplayName, loadContactProperties, loadDealProperties } from '../../helpers/fieldMapping';
import { canUsePropertyAsField } from '../resourceMappers/canUsePropertyAsField';

type PipelinePayload = { id: string; displayName: string; phases: Array<{ id: string; displayName: string }> };

type FormPayload = { formId: string; name: string };

type CallTypePayload = { id: string; name: string; category?: string };

export async function loadContactPropertiesAsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const properties = await loadContactProperties(this);

  return properties
    .filter((p) => p.dynamicDbTableName === 'Contact' || p.dynamicDbTableName === 'ContactPerson')
    .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'en', { sensitivity: 'base' }))
    .map((p) => ({
      name: getDisplayName(p),
      value: p.propertyIdentifier,
    }));
}

export async function loadDealPropertiesAsOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const properties = await loadDealProperties(this);
  return properties
    .filter((p) => p.dynamicDbTableName === 'Deal' && canUsePropertyAsField(p))
    .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), 'en', { sensitivity: 'base' }))
    .map((p) => ({
      name: getDisplayName(p),
      value: p.propertyIdentifier,
    }));
}

export async function loadPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this);
  const data = (await client.GET('/pipelines')) as PipelinePayload[];
  return (data ?? []).map((p) => ({ name: p.displayName || p.id, value: p.id }));
}

export async function loadStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const pipelineId = this.getNodeParameter('pipelineId', 0) as string;
  if (!pipelineId) return [{ name: 'Please Select a Pipeline First', value: '' }];

  const client = getApiClient(this);
  const data = (await client.GET('/pipelines')) as PipelinePayload[];
  const pipeline = (data ?? []).find((p) => String(p.id) === String(pipelineId));
  if (!pipeline) return [{ name: 'Pipeline not found', value: '' }];

  return (pipeline.phases ?? []).map((phase) => ({ name: phase.displayName || phase.id, value: phase.id }));
}

export async function loadForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this);
  const data = (await client.GET('/form')) as FormPayload[];
  return (data ?? []).map((f) => ({ name: f.name || f.formId, value: f.formId }));
}

export async function loadPhoneCallActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this);
  const data = (await client.GET('/call-types')) as CallTypePayload[];
  return (data ?? []).map((t) => ({ name: t.name, value: t.id }));
}
