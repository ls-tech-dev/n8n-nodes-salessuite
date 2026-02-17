import { INodeProperties } from 'n8n-workflow';

export const dealOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['deal'] } },
    options: [
      {
        name: 'Create Deal',
        value: 'createDeal',
        description: 'Create a new deal in the system',
        action: 'Create a deal',
      },
      { name: 'Find Deal by ID', value: 'getById', description: 'Find a deal by ID', action: 'Find a deal by ID' },
      {
        name: 'Find Related Deals by Email',
        value: 'findDealsByEmail',
        description: 'Find all deals linked to the contact owning this email address',
        action: 'Find related deals by email',
      },
      {
        name: 'List Deals',
        value: 'listDeals',
        description: 'List deals with pagination',
        action: 'List deals',
      },
      {
        name: 'List Pipelines',
        value: 'getPipelines',
        description: 'List all pipelines and phases',
        action: 'List pipelines',
      },
      {
        name: 'Update Deal (Per Deal-ID)',
        value: 'updateDeal',
        description: 'Update an existing deal',
        action: 'Update a deal',
      },
    ],
    default: 'createDeal',
  },
];

export const dealFields: INodeProperties[] = [
  // ===== CREATE DEAL =====
  {
    displayName: 'Deal Name',
    name: 'name',
    type: 'string',
    displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
    required: true,
    default: '',
    description: 'Name of the Deal',
  },
  {
    displayName: 'Contact Name or ID',
    name: 'contactId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getContacts' },
    displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
    required: true,
    default: '',
    description: 'Associated contact ID. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
    required: true,
    default: '',
    description: 'Pipeline to create the deal in. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Phase Name or ID',
    name: 'phaseId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getStagesByPipeline',
      loadOptionsDependsOn: ['pipelineId'],
      reloadOptions: true,
    },
    displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
    required: true,
    default: '',
    description: 'Phase within the selected pipeline. Choose from the list, or specify an ID using an expression.',
  },

  // CREATE – Mapper
  {
    displayName: 'Fields',
    name: 'fields',
    type: 'resourceMapper',
    default: { mappingMode: 'defineBelow', value: null },
    noDataExpression: true,
    displayOptions: { show: { resource: ['deal'], operation: ['createDeal'] } },
    typeOptions: {
      resourceMapper: {
        resourceMapperMethod: 'getDealResourceMapperFields',
        mode: 'add',
        addAllFields: true,
        multiKeyMatch: false,
        supportAutoMap: false,
        fieldWords: { singular: 'field', plural: 'fields' },
      },
    },
    description: 'Additional deal fields to set on create',
  },

  // Initial Note (optional) bei CREATE
  {
    displayName: 'Also Create Initial Note?',
    name: 'createInitialNote',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['createDeal'],
      },
    },
    default: false,
    description: 'Whether if enabled, a note will be created right after the deal is created',
  },
  {
    displayName: 'Initial Note Text',
    name: 'initialNoteText',
    type: 'string',
    typeOptions: { rows: 4 },
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['createDeal'],
        createInitialNote: [true],
      },
    },
    default: '',
    description: 'Plain text note',
  },
  {
    displayName: 'Pin Note?',
    name: 'pinInitialNote',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['createDeal'],
        createInitialNote: [true],
      },
    },
    default: false,
  },
  {
    displayName: 'Bold Note Text?',
    name: 'makeBold',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['createDeal'],
        createInitialNote: [true],
      },
    },
    default: false,
  },

  // ===== UPDATE DEAL =====
  {
    displayName: 'Deal Name or ID',
    name: 'dealId',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getDeals',
      reloadOptions: true,
    },
    required: true,
    default: '',
    description: 'Pick a deal. Choose from the list, or specify an ID using an expression.',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['updateDeal', 'getById'],
      },
    },
  },
  {
    displayName: 'Deal Name',
    name: 'name',
    type: 'string',
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
    default: '',
    description: 'Name of the Deal',
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    required: true,
    placeholder: 'contact@example.com',
    displayOptions: { show: { resource: ['deal'], operation: ['findDealsByEmail'] } },
    default: '',
    description: 'Email address of the contact whose related deals should be returned',
  },
  {
    displayName: 'Update Deal Pipeline/Phase?',
    name: 'updatePipelineStage',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['updateDeal'],
      },
    },
  },
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'], updatePipelineStage: [true] } },
    default: '',
    description: 'Pipeline to update the deal in. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Phase Name or ID',
    name: 'phaseId',
    type: 'options',
    default: '',
    typeOptions: {
      loadOptionsMethod: 'getStagesByPipeline',
      loadOptionsDependsOn: ['pipelineId'],
      reloadOptions: true,
    },
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'], updatePipelineStage: [true] } },
    description: 'Phase within the selected pipeline. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Append Values to Multi-Select Fields?',
    name: 'appendMultiSelectValues',
    type: 'boolean',
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
    default: false,
    description: 'When enabled, new multi-select values are appended instead of replacing existing values.',
  },
  // UPDATE – Mapper
  {
    displayName: 'Fields',
    name: 'fields',
    type: 'resourceMapper',
    default: { mappingMode: 'defineBelow', value: null },
    noDataExpression: true,
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
    typeOptions: {
      resourceMapper: {
        resourceMapperMethod: 'getDealResourceMapperFieldsForUpdate',
        mode: 'add',
        addAllFields: true,
        multiKeyMatch: false,
        supportAutoMap: false,
        fieldWords: { singular: 'field', plural: 'fields' },
      },
    },
    description: 'Fields to update. Leave fields empty to keep their current value.',
  },

  // Initial Note (optional) bei UPDATE
  {
    displayName: 'Also Create Initial Note?',
    name: 'createInitialNote',
    type: 'boolean',
    displayOptions: { show: { resource: ['deal'], operation: ['updateDeal'] } },
    default: false,
    description: 'Whether if enabled, a note will be created right after the deal is updated',
  },
  {
    displayName: 'Initial Note Text',
    name: 'initialNoteText',
    type: 'string',
    typeOptions: { rows: 4 },
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['updateDeal'],
        createInitialNote: [true],
      },
    },
    default: '',
    description: 'Plain text note',
  },
  {
    displayName: 'Pin Note?',
    name: 'pinInitialNote',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['updateDeal'],
        createInitialNote: [true],
      },
    },
    default: false,
  },
  {
    displayName: 'Bold Note Text?',
    name: 'makeBold',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: ['deal'],
        operation: ['updateDeal'],
        createInitialNote: [true],
      },
    },
    default: false,
  },

  // ===== LIST DEALS =====
  {
    displayName: 'Page',
    name: 'page',
    type: 'number',
    default: 0,
    displayOptions: { show: { resource: ['deal'], operation: ['listDeals'] } },
  },
  {
    displayName: 'Pipeline Name or ID',
    name: 'pipelineId',
    type: 'options',
    typeOptions: { loadOptionsMethod: 'getPipelines' },
    default: '',
    displayOptions: { show: { resource: ['deal'], operation: ['listDeals'] } },
    description: 'Optional pipeline filter. Choose from the list, or specify an ID using an expression.',
  },
  {
    displayName: 'Page Size',
    name: 'pageSize',
    type: 'number',
    default: 25,
    typeOptions: { minValue: 1 },
    displayOptions: { show: { resource: ['deal'], operation: ['listDeals'] } },
  },
];
