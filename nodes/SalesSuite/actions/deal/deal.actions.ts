import { ApplicationError, IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { getApiClient } from '../../helpers/apiclient';
import { buildTypeMap, loadDealProperties, normalizeValue, splitPrefixedFields } from '../../helpers/fieldMapping';
import { createNoteWithOptionalPin } from '../../helpers/notes';

async function sanitizeDealPayload(this: IExecuteFunctions, raw: unknown) {
  const maybe = (raw ?? {}) as IDataObject;
  const val = (maybe.value ?? maybe) as IDataObject;

  const { deal } = splitPrefixedFields(val);

  const properties = await loadDealProperties(this);
  const typeMap = buildTypeMap(properties);

  const out: Record<string, any> & { name?: string } = {};
  for (const [key, value] of Object.entries(deal)) {
    const typeDef = typeMap.get(`deal.${key}`);
    const normalized = normalizeValue(value, typeDef);
    if (normalized === undefined) continue;
    out[key] = normalized;
  }

  return out;
}

export async function handleDeal(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
  const client = getApiClient(this);
  switch (operation) {
    case 'createDeal': {
      const name = this.getNodeParameter('name', i) as string;
      const contactId = this.getNodeParameter('contactId', i) as string;
      const pipelineId = this.getNodeParameter('pipelineId', i) as string;
      const phaseId = this.getNodeParameter('phaseId', i) as string;

      const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
      const dataObj = await sanitizeDealPayload.call(this, fieldsParam);

      if (name) dataObj.name = name;
      if (!dataObj.name) {
        throw new ApplicationError('Create Deal requires a name.');
      }

      const result = await client.POST('/deal', {
        params: { query: { pipelineId, contactId, phaseId } },
        body: dataObj as { name: string },
      });

      const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
      const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
      let initialNoteId: string | undefined;
      if (createInitialNote && result?.deal?.id) {
        const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
        const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
        if (initialNoteText && initialNoteText.trim()) {
          initialNoteId = await createNoteWithOptionalPin(this, result.deal.id as string, initialNoteText, pinInitialNote, makeBold, 'deal');
        }
      }

      return { ...(result ?? {}), inputData: { contactId, pipelineId, phaseId, ...dataObj }, initialNoteId };
    }

    case 'updateDeal': {
      const dealId = this.getNodeParameter('dealId', i) as string;

      const rawName = (this.getNodeParameter('name', i, '') as string) ?? '';
      const name = rawName.trim() || undefined;

      const updatePipelineStage = this.getNodeParameter('updatePipelineStage', i, false) as boolean;
      const pipelineIdParam = (this.getNodeParameter('pipelineId', i, '') as string).trim();
      const phaseIdParam = (this.getNodeParameter('phaseId', i, '') as string).trim();

      const fieldsParam = this.getNodeParameter('fields', i, {} as IDataObject);
      const dataObj = await sanitizeDealPayload.call(this, fieldsParam);

      if (name !== undefined) dataObj.name = name;

      const hasFields = Object.keys(dataObj).length > 0;
      if (!updatePipelineStage && !hasFields) {
        throw new ApplicationError('No fields provided to update.');
      }

      const qs: IDataObject = {};
      if (updatePipelineStage) {
        if (!pipelineIdParam || !phaseIdParam) {
          throw new ApplicationError('To update pipeline/phase, both pipelineId and phaseId are required.');
        }
        qs.pipelineId = pipelineIdParam;
        qs.phaseId = phaseIdParam;
      }

      const appendMultiSelectValues = this.getNodeParameter('appendMultiSelectValues', i, false) as boolean;
      qs.appendMultiSelectValues = appendMultiSelectValues;

      const result = await client.PATCH(`/deal/{id}`, {
        params: { query: qs, path: { id: dealId } },
        body: dataObj as any,
      });

      const createInitialNote = this.getNodeParameter('createInitialNote', i, false) as boolean;
      const pinInitialNote = this.getNodeParameter('pinInitialNote', i, false) as boolean;
      let initialNoteId: string | undefined;
      if (createInitialNote) {
        const initialNoteText = this.getNodeParameter('initialNoteText', i, '') as string;
        const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;
        if (initialNoteText && initialNoteText.trim()) {
          initialNoteId = await createNoteWithOptionalPin(this, dealId, initialNoteText, pinInitialNote, makeBold, 'deal');
        }
      }

      return { ...(result ?? {}), inputData: dataObj, initialNoteId };
    }

    case 'getById': {
      const dealId = this.getNodeParameter('dealId', i) as string;
      const data = await client.GET(`/deal/{dealId}`, {
        params: { path: { dealId } },
      });
      return data ?? {};
    }

    case 'findDealsByEmail': {
      const email = this.getNodeParameter('email', i) as string;
      const data = await client.GET('/deal/by-email', {
        params: { query: { email } },
      });
      return { email, deals: data ?? [] };
    }

    case 'listDeals': {
      const page = this.getNodeParameter('page', i, 0) as number;
      const pageSize = this.getNodeParameter('pageSize', i, 25) as number;
      const pipelineId = (this.getNodeParameter('pipelineId', i, '') as string) || undefined;

      const data = await client.GET('/deal', {
        params: { query: { page, pageSize, pipelineId } },
      });
      return { page, pageSize, pipelineId: pipelineId ?? null, deals: data ?? [] };
    }

    case 'getPipelines': {
      const data = await client.GET('/pipelines');
      return data ?? [];
    }

    default:
      throw new ApplicationError(`Unsupported deal operation: ${operation}`);
  }
}
