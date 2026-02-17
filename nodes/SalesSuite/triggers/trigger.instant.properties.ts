import type { INodeProperties } from 'n8n-workflow';

export const instantProperties: INodeProperties[] = [
  {
    displayName: 'Event',
    name: 'events',
    type: 'options',
    default: 'deal.created',
    options: [
      {
        name: 'Contact Property Changed',
        value: 'contact.propertyChanged',
        description: 'Triggers when a contact property is filled or edited',
      },
      {
        name: 'Deal Property Changed',
        value: 'deal.propertyChanged',
        description: 'Triggers when a deal property is filled or edited',
      },
      {
        name: 'Deal Stage Changed',
        value: 'deal.stageChanged',
        description: 'Triggers when the deal phase changes',
      },
      {
        name: 'Contact Created',
        value: 'contact.created',
        description: 'Triggers when a new contact is created',
      },
      { name: 'Deal Created', value: 'deal.created', description: 'Triggers when a new deal is created' },
      {
        name: 'Form Submitted',
        value: 'form.submitted',
        description: 'Triggers when a form is submitted',
      },
      {
        name: 'Call Activity Created',
        value: 'activity.created',
        description: 'Triggers when a call activity is created',
      },
    ],
    description: 'Which event should trigger the webhook?',
  },

  /** ---------- Contact Property Trigger ---------- */
  {
    displayName: 'Contact Property Names or IDs',
    name: 'contactProperties',
    type: 'multiOptions',
    typeOptions: { loadOptionsMethod: 'getContactProperties' },
    default: [],
    required: true,
    placeholder: 'Select contact properties',
    displayOptions: { show: { events: ['contact.propertyChanged'] } },
    description: 'Choose from the list, or specify IDs using an expression',
  },

  /** ---------- Deal Property Trigger ---------- */
  {
    displayName: 'Deal Property Names or IDs',
    name: 'dealProperties',
    type: 'multiOptions',
    typeOptions: { loadOptionsMethod: 'getDealProperties' },
    default: [],
    required: true,
    placeholder: 'Select deal properties',
    displayOptions: { show: { events: ['deal.propertyChanged'] } },
    description: 'Choose from the list, or specify IDs using an expression',
  },

  /** ------- Deal Stage Trigger Scope ------- */
  {
    displayName: 'Trigger Scope',
    name: 'dealStageScope',
    type: 'options',
    default: 'all',
    options: [
      { name: 'All Pipelines & Phases', value: 'all' },
      { name: 'Specific Phase in Pipeline', value: 'specific' },
    ],
    displayOptions: { show: { events: ['deal.stageChanged'] } },
    description: 'Control whether to trigger on all phase changes or a specific phase',
  },
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    default: '',
    required: true,
    displayOptions: {
      show: { events: ['deal.stageChanged'], dealStageScope: ['specific'] },
    },
    description: 'Choose from the list, or specify an ID using an expression',
  },
  {
    displayName: 'Phase Name or ID',
    name: 'phaseId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getStages', loadOptionsDependsOn: ['pipelineId'] },
    default: '',
    required: true,
    displayOptions: {
      show: { events: ['deal.stageChanged'], dealStageScope: ['specific'] },
    },
    description: 'Choose from the list, or specify an ID using an expression',
  },

  /** ---------- Deal Created (optional pipeline filter) ---------- */
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    default: '',
    displayOptions: {
      show: { events: ['deal.created'] },
    },
    description: 'Optional pipeline filter',
  },

  /** ---------- Form Trigger ---------- */
  {
    displayName: 'Form Name or ID',
    name: 'formId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getForms' },
    default: '',
    required: true,
    placeholder: 'Select form',
    displayOptions: { show: { events: ['form.submitted'] } },
    description: 'Choose from the list, or specify an ID using an expression',
  },

  // ——— CALL ACTIVITY ———
  {
    displayName: 'Select Call Type',
    name: 'callTypeId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadPhoneCallActivityTypes' },
    default: 'any',
    displayOptions: { show: { events: ['activity.created'] } },
    description: 'Filter by call type or listen to any call',
  },
  {
    displayName: 'Call Result',
    name: 'callResult',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'loadCallResultTypes',
      loadOptionsDependsOn: ['callTypeId'],
    },
    default: 'any',
    displayOptions: { show: { events: ['activity.created'] } },
    description: 'Filter by call result or listen to any result',
  },
];
