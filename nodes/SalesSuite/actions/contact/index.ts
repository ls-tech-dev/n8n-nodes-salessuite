import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['contact'] } },
    options: [
      {
        name: 'Create Contact',
        value: 'createContact',
        description: 'Create a new contact (no upsert)',
        action: 'Create a contact',
      },
      {
        name: 'Find Contact by Email',
        value: 'getByEmail',
        description: 'Find a contact by email address',
        action: 'Find contact by email',
      },
      {
        name: 'Get Contact by ID',
        value: 'getContactById',
        description: 'Get a contact by contact ID',
        action: 'Get contact by ID',
      },
      {
        name: 'List Contacts',
        value: 'listContacts',
        description: 'List contacts with pagination',
        action: 'List contacts',
      },
      {
        name: 'Search Contacts',
        value: 'searchContacts',
        description: 'Search contacts by text',
        action: 'Search contacts',
      },
      {
        name: 'Update Contact (by ID)',
        value: 'updateContact',
        description: 'Update a contact by ID',
        action: 'Update a contact by ID',
      },
      {
        name: 'Upsert Contact (by Email)',
        value: 'upsertContact',
        description: 'Find by email, update if found, otherwise create',
        action: 'Upsert a contact',
      },
    ],
    default: 'upsertContact',
  },
];

export const contactFields: INodeProperties[] = [
  // ===== CREATE =====
  {
    displayName: 'Fields',
    name: 'fields',
    type: 'resourceMapper',
    default: { mappingMode: 'defineBelow', value: null },
    noDataExpression: true,
    required: true,
    displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
    typeOptions: {
      resourceMapper: {
        resourceMapperMethod: 'getContactResourceMapperFields',
        mode: 'add',
        fieldWords: { singular: 'field', plural: 'fields' },
        addAllFields: true,
        multiKeyMatch: true,
        supportAutoMap: false,
      },
    },
    description: 'All available contact fields from your account',
  },
  // Optional initial note
  {
    displayName: 'Also Create Initial Note?',
    name: 'createInitialNote',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['createContact'] } },
  },
  {
    displayName: 'Initial Note Text',
    name: 'initialNoteText',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
  },
  {
    displayName: 'Pin Note?',
    name: 'pinInitialNote',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
  },
  {
    displayName: 'Bold Note Text?',
    name: 'makeBold',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['createContact'], createInitialNote: [true] } },
  },

  // ===== UPDATE =====
  {
    displayName: 'Contact Name or ID',
    name: 'contactId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getContacts' },
    default: '',
    required: true,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact', 'getContactById'] } },
    description: 'Choose the contact to update. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Allow changing Email?',
    name: 'allowChangeEmail',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
  },
  {
    displayName: 'Append Values to Multi-Select Fields?',
    name: 'appendMultiSelectValues',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact', 'upsertContact'] } },
    description: 'When enabled, new multi-select values are appended instead of replacing existing values.',
  },
  {
    displayName: 'Fields',
    name: 'fields',
    type: 'resourceMapper',
    noDataExpression: true,
    default: { mappingMode: 'defineBelow', value: null },
    required: true,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
    typeOptions: {
      resourceMapper: {
        resourceMapperMethod: 'getContactResourceMapperFields',
        mode: 'add',
        fieldWords: { singular: 'field', plural: 'fields' },
        addAllFields: true,
        multiKeyMatch: false,
        supportAutoMap: false,
      },
    },
  },
  // Optional note after update
  {
    displayName: 'Also Create Note?',
    name: 'createInitialNote',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'] } },
  },
  {
    displayName: 'Note Text',
    name: 'initialNoteText',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
  },
  {
    displayName: 'Pin Note?',
    name: 'pinInitialNote',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
  },
  {
    displayName: 'Bold Note Text?',
    name: 'makeBold',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['contact'], operation: ['updateContact'], createInitialNote: [true] } },
  },

  // ===== UPSERT =====
  {
    displayName: 'Upsert matches on Contact Person email first, then Contact email.',
    name: 'upsertInfo',
    type: 'notice',
    default: '',
    displayOptions: { show: { resource: ['contact'], operation: ['upsertContact'] } },
  },
  {
    displayName: 'Fields (for Create or Update)',
    name: 'fields',
    type: 'resourceMapper',
    noDataExpression: true,
    default: { mappingMode: 'defineBelow', value: null },
    required: true,
    displayOptions: { show: { resource: ['contact'], operation: ['upsertContact'] } },
    typeOptions: {
      resourceMapper: {
        resourceMapperMethod: 'getContactResourceMapperFields',
        mode: 'upsert',
        fieldWords: { singular: 'field', plural: 'fields' },
        addAllFields: true,
        multiKeyMatch: false,
        supportAutoMap: false,
      },
    },
  },

  // ===== OTHER OPS =====
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    placeholder: 'name@email.com',
    default: '',
    required: true,
    displayOptions: { show: { resource: ['contact'], operation: ['getByEmail'] } },
  },
  {
    displayName: 'Search String',
    name: 'searchString',
    type: 'string',
    default: '',
    displayOptions: { show: { resource: ['contact'], operation: ['searchContacts'] } },
  },
  {
    displayName: 'Page',
    name: 'page',
    type: 'number',
    default: 0,
    displayOptions: { show: { resource: ['contact'], operation: ['listContacts'] } },
  },
  {
    displayName: 'Page Size',
    name: 'pageSize',
    type: 'number',
    description: 'Max number of results to return',
    default: 25,
    typeOptions: { minValue: 1 },
    displayOptions: { show: { resource: ['contact'], operation: ['listContacts'] } },
  },
];
