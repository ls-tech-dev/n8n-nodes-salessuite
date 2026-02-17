import type { INodeProperties } from 'n8n-workflow';

export const resourceSelector: INodeProperties = {
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    {
      name: 'Activity',
      value: 'activity',
      description: 'Create notes and list call or email activities',
    },
    {
      name: 'Contact',
      value: 'contact',
      description: 'Create, update, and manage contacts',
    },
    {
      name: 'Deal',
      value: 'deal',
      description: 'Work with deals – from creation to updates and pipeline management',
    },
    {
      name: 'Webhook',
      value: 'webhook',
      description: 'Manage webhook subscriptions in SalesSuite',
    },
  ],
  default: 'contact',
};
