import { INodeProperties } from 'n8n-workflow';

export const activityOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['activity'] } },
    options: [
      {
        name: 'Create Note',
        value: 'createNote',
        action: 'Create note on contact',
        description: 'Add an internal note to a contact',
      },
      {
        name: 'List Email Activities',
        value: 'listEmailActivities',
        action: 'List contact emails',
        description: 'Retrieve a history of emails for the selected contact',
      },
      {
        name: 'List Phone Call Activities',
        value: 'listPhoneCallActivities',
        action: 'List contact calls',
        description: 'Retrieve logged phone call activities related to the contact',
      },
    ],
    default: 'createNote',
  },
];

export const activityFields: INodeProperties[] = [
  {
    displayName: 'Contact Name or ID',
    name: 'contactId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getContacts' },
    required: true,
    default: '',
    displayOptions: {
      show: {
        resource: ['activity'],
        operation: ['createNote', 'listEmailActivities', 'listPhoneCallActivities'],
      },
    },
    description: 'Choose the contact. Choose from the list, or specify an ID using an expression.',
  },

  // Create Note
  {
    displayName: 'Note Text',
    name: 'noteText',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
    description: 'Plain text note',
  },
  {
    displayName: 'Pin Note?',
    name: 'pinNote',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
  },
  {
    displayName: 'Bold Text?',
    name: 'makeBold',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['activity'], operation: ['createNote'] } },
  },

  // List Call Activities Filters
  {
    displayName: 'Call Type Name or ID',
    name: 'phoneCallActivityTypeId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'loadPhoneCallActivityTypes' },
    default: 'any',
    displayOptions: { show: { resource: ['activity'], operation: ['listPhoneCallActivities'] } },
    description: 'Optional filter by call type',
  },
  {
    displayName: 'Call Result',
    name: 'callResult',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'loadCallResultTypes',
      loadOptionsDependsOn: ['phoneCallActivityTypeId'],
    },
    default: 'any',
    displayOptions: { show: { resource: ['activity'], operation: ['listPhoneCallActivities'] } },
    description: 'Optional filter by call result',
  },
];
