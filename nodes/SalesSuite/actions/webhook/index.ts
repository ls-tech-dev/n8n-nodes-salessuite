import { INodeProperties } from 'n8n-workflow';

export const webhookOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['webhook'] } },
    options: [
      { name: 'List Webhooks', value: 'listWebhooks', action: 'List webhooks' },
      { name: 'Create Webhook', value: 'createWebhook', action: 'Create a webhook' },
      { name: 'Update Webhook', value: 'updateWebhook', action: 'Update a webhook' },
      { name: 'Delete Webhook', value: 'deleteWebhook', action: 'Delete a webhook' },
    ],
    default: 'listWebhooks',
  },
];

export const webhookFields: INodeProperties[] = [
  /** List */
  {
    displayName: 'Nothing to configure',
    name: 'noop',
    type: 'notice',
    default: '',
    displayOptions: { show: { resource: ['webhook'], operation: ['listWebhooks'] } },
  },

  /** Create */
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'https://n8n.example.com/webhook/12345',
    displayOptions: { show: { resource: ['webhook'], operation: ['createWebhook'] } },
  },
  {
    displayName: 'Event Type',
    name: 'triggers',
    type: 'options',
    required: true,
    default: '',
    description: 'Choose from the list, or specify an ID using an expression',
    typeOptions: { loadOptionsMethod: 'getWebhookTriggers' },
    displayOptions: { show: { resource: ['webhook'], operation: ['createWebhook'] } },
  },

  /** Properties for contact/deal property change */
  {
    displayName: 'Property Names or IDs',
    name: 'properties',
    type: 'multiOptions',
    default: [],
    required: true,
    description: 'Select the fields to watch. Choose from the list, or specify IDs using an expression.',
    typeOptions: { loadOptionsMethod: 'getWebhookProperties', reloadOptions: true },
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['createWebhook'],
        triggers: ['contact.propertyChanged', 'deal.propertyChanged'],
      },
    },
  },

  /** Pipeline / Phase for deal.stageChanged */
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    default: '',
    description: 'Optional pipeline filter',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['deal.stageChanged', 'deal.created'] },
    },
  },
  {
    displayName: 'Phase Name or ID',
    name: 'phaseId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
    default: '',
    description: 'Optional phase filter',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['deal.stageChanged'] },
    },
  },

  /** Form ID for form.submitted */
  {
    displayName: 'Form Name or ID',
    name: 'formId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getFormsAsOptions' },
    default: '',
    required: true,
    description: 'Required when trigger is form.submitted',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['form.submitted'] },
    },
  },

  /** Activity filters */
  {
    displayName: 'Call Type Name or ID',
    name: 'callTypeId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadPhoneCallActivityTypes' },
    default: 'any',
    description: 'Optional filter by call type',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['activity.created'] },
    },
  },
  {
    displayName: 'Call Result',
    name: 'callResult',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadCallResultTypes', loadOptionsDependsOn: ['callTypeId'] },
    default: 'any',
    description: 'Optional filter by call result',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['createWebhook'], triggers: ['activity.created'] },
    },
  },

  /** Update */
  {
    displayName: 'Webhook Name or ID',
    name: 'webhookId',
    type: 'options',
    required: true,
    description: 'Choose from the list, or specify an ID using an expression',
    typeOptions: { loadOptionsMethod: 'getWebhooksAsOptions' },
    default: '',
    displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
  },
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    default: '',
    placeholder: 'https://n8n.example.com/webhook/12345',
    displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
  },
  {
    displayName: 'Event Type',
    name: 'triggers',
    type: 'options',
    default: '',
    description: 'Choose from the list, or specify an ID using an expression',
    typeOptions: { loadOptionsMethod: 'getWebhookTriggers' },
    displayOptions: { show: { resource: ['webhook'], operation: ['updateWebhook'] } },
  },

  /** Properties for contact/deal property change (update) */
  {
    displayName: 'Property Names or IDs',
    name: 'properties',
    type: 'multiOptions',
    default: [],
    description: 'Select the fields to watch. Choose from the list, or specify IDs using an expression.',
    typeOptions: { loadOptionsMethod: 'getWebhookProperties' },
    displayOptions: {
      show: {
        resource: ['webhook'],
        operation: ['updateWebhook'],
        triggers: ['contact.propertyChanged', 'deal.propertyChanged'],
      },
    },
  },

  /** Pipeline / Phase for deal.stageChanged (update) */
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    default: '',
    description: 'Optional pipeline filter',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['deal.stageChanged', 'deal.created'] },
    },
  },
  {
    displayName: 'Phase Name or ID',
    name: 'phaseId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getStagesByPipeline', loadOptionsDependsOn: ['pipelineId'] },
    default: '',
    description: 'Optional phase filter',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['deal.stageChanged'] },
    },
  },

  /** Form ID for form.submitted (update) */
  {
    displayName: 'Form Name or ID',
    name: 'formId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getFormsAsOptions' },
    default: '',
    description: 'Set when trigger is form.submitted',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['form.submitted'] },
    },
  },

  /** Activity filters (update) */
  {
    displayName: 'Call Type Name or ID',
    name: 'callTypeId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadPhoneCallActivityTypes' },
    default: 'any',
    description: 'Optional filter by call type',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['activity.created'] },
    },
  },
  {
    displayName: 'Call Result',
    name: 'callResult',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadCallResultTypes', loadOptionsDependsOn: ['callTypeId'] },
    default: 'any',
    description: 'Optional filter by call result',
    displayOptions: {
      show: { resource: ['webhook'], operation: ['updateWebhook'], triggers: ['activity.created'] },
    },
  },

  /** Delete */
  {
    displayName: 'Webhook Name or ID',
    name: 'webhookId',
    type: 'options',
    required: true,
    description: 'Choose from the list, or specify an ID using an expression',
    typeOptions: { loadOptionsMethod: 'getWebhooksAsOptions' },
    default: '',
    displayOptions: { show: { resource: ['webhook'], operation: ['deleteWebhook'] } },
  },
];
