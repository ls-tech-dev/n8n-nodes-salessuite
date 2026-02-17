import { ApplicationError, IExecuteFunctions } from 'n8n-workflow';

import { type BodyParams, getApiClient } from '../../helpers/apiclient';
import { createNoteWithOptionalPin } from '../../helpers/notes';

export async function handleActivity(this: IExecuteFunctions, i: number, operation: string): Promise<unknown> {
  switch (operation) {
    case 'createNote': {
      const contactId = this.getNodeParameter('contactId', i) as string;
      const noteText = this.getNodeParameter('noteText', i, '') as string;
      const pinNote = this.getNodeParameter('pinNote', i, false) as boolean;
      const makeBold = this.getNodeParameter('makeBold', i, false) as boolean;

      const noteId = await createNoteWithOptionalPin(this, contactId, noteText, pinNote, makeBold, 'contact');
      return { parentType: 'contact', parentId: contactId, noteId: noteId ?? null };
    }

    case 'listEmailActivities': {
      const contactId = this.getNodeParameter('contactId', i) as string;
      const client = getApiClient(this);
      const data = await client.POST('/get-mail-activities', {
        body: { contactId } as any,
      });
      return { scope: 'contact', parentId: contactId, activities: data ?? [] };
    }

    case 'listPhoneCallActivities': {
      const contactId = this.getNodeParameter('contactId', i) as string;
      const callTypeId = (this.getNodeParameter('phoneCallActivityTypeId', i, '') as string).trim();
      const callResult = (this.getNodeParameter('callResult', i, '') as string).trim();

      const body: BodyParams<'/get-call-activities', 'post'> = { contactId } as any;
      if (callTypeId && callTypeId !== 'any') body.callTypeId = callTypeId;
      if (callResult && callResult !== 'any') {
        try {
          body.callResult = typeof callResult === 'string' ? JSON.parse(callResult) : (callResult as any);
        } catch {
          body.callResult = callResult as any;
        }
      }

      const data = await getApiClient(this).POST('/get-call-activities', {
        body: body,
      });
      return { scope: 'contact', parentId: contactId, activities: data ?? [] };
    }

    default:
      throw new ApplicationError(`Unsupported activity operation: ${operation}`);
  }
}
