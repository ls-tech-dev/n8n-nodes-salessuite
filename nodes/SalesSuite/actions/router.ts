import { ApplicationError, IExecuteFunctions } from 'n8n-workflow';

import { handleActivity } from './activity/activity.actions';
import { handleContact } from './contact/contact.actions';
import { handleDeal } from './deal/deal.actions';
import { handleWebhook } from './webhook/webhook.actions';

export async function route(this: IExecuteFunctions, i: number, resource: string, operation: string): Promise<unknown> {
  switch (resource) {
    case 'activity':
      return await handleActivity.call(this, i, operation);

    case 'contact':
      return await handleContact.call(this, i, operation);

    case 'deal':
      return await handleDeal.call(this, i, operation);

    case 'webhook':
      return await handleWebhook.call(this, i, operation);

    default:
      throw new ApplicationError(`Unsupported resource: ${resource}`);
  }
}
