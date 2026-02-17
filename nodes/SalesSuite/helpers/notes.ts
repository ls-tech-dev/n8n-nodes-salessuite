import { ApplicationError, IExecuteFunctions } from 'n8n-workflow';

import { getApiClient } from './apiclient';

export async function createNoteWithOptionalPin(ctx: IExecuteFunctions, parentId: string, plainText: string, _pin: boolean, _makeBold?: boolean, parentType: 'contact' | 'deal' = 'contact') {
  if (!parentId?.trim()) throw new ApplicationError('createNote: parentId is required');

  const noteText = (plainText ?? '').trim();
  if (!noteText) throw new ApplicationError('createNote: note text is required');

  const qs = parentType === 'deal' ? { dealId: parentId } : { contactId: parentId };

  const client = getApiClient(ctx) as any;
  const result = await client.POST('/note', {
    params: { query: qs },
    body: noteText as any,
    json: false,
    headers: {
      'Content-Type': 'text/plain',
    },
  });

  return result?.id ?? null;
}
