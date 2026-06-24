import { INodeProperties } from "n8n-workflow";

export const dealOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["deal"] } },
		options: [
			{
				name: "Change Deal Pipeline Phase",
				value: "changeDealPipelinePhase",
				description: "Move a deal to a different pipeline and phase",
				action: "Change deal pipeline phase",
			},
			{
				name: "Create Deal",
				value: "createDeal",
				description: "Create a new deal in the system",
				action: "Create a deal",
			},
			{
				name: "Find Deal by ID",
				value: "getById",
				description: "Find a deal by ID",
				action: "Find a deal by ID",
			},
			{
				name: "Find Deals by Contact ID",
				value: "getDealsByContactId",
				description: "Find all deals linked to a contact by contact ID",
				action: "Find deals by contact ID",
			},
			{
				name: "Find Related Deals by Email",
				value: "findDealsByEmail",
				description:
					"Find all deals linked to the contact owning this email address",
				action: "Find related deals by email",
			},
			{
				name: "Get Deals by Pipeline Phase",
				value: "getDealsByPipelinePhase",
				description: "Fetch all deals in a specific pipeline phase",
				action: "Get deals by pipeline phase",
			},
			{
				name: "List Deals",
				value: "listDeals",
				description: "List deals with pagination",
				action: "List deals",
			},
			{
				name: "List Pipelines",
				value: "getPipelines",
				description: "List all pipelines and phases",
				action: "List pipelines",
			},
			{
				name: "Update Deal (Per Deal-ID)",
				value: "updateDeal",
				description: "Update an existing deal",
				action: "Update a deal",
			},
		],
		default: "createDeal",
	},
];

export const dealFields: INodeProperties[] = [
	// ===== CREATE DEAL =====
	{
		displayName: "Deal Name",
		name: "name",
		type: "string",
		displayOptions: { show: { resource: ["deal"], operation: ["createDeal"] } },
		required: true,
		default: "",
		description: "Name of the Deal",
	},
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		displayOptions: { show: { resource: ["deal"], operation: ["createDeal"] } },
		required: true,
		default: "",
		description:
			'Associated contact ID. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Pipeline Name or ID",
		name: "pipelineId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getPipelines" },
		displayOptions: { show: { resource: ["deal"], operation: ["createDeal"] } },
		required: true,
		default: "",
		description:
			'Pipeline to create the deal in. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Phase Name or ID",
		name: "phaseId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getStagesByPipeline",
			loadOptionsDependsOn: ["pipelineId"],
			reloadOptions: true,
		},
		displayOptions: { show: { resource: ["deal"], operation: ["createDeal"] } },
		required: true,
		default: "",
		description:
			'Phase within the selected pipeline. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// CREATE – Mapper
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		default: { mappingMode: "defineBelow", value: null },
		noDataExpression: true,
		displayOptions: { show: { resource: ["deal"], operation: ["createDeal"] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getDealResourceMapperFields",
				mode: "add",
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
				fieldWords: { singular: "field", plural: "fields" },
			},
		},
		description: "Additional deal fields to set on create",
	},

	// Initial Note (optional) bei CREATE
	{
		displayName: "Also Create Initial Note?",
		name: "createInitialNote",
		type: "boolean",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["createDeal"],
			},
		},
		default: false,
		description:
			"Whether if enabled, a note will be created right after the deal is created",
	},
	{
		displayName: "Initial Note Text",
		name: "initialNoteText",
		type: "string",
		typeOptions: { rows: 4 },
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["createDeal"],
				createInitialNote: [true],
			},
		},
		default: "",
		description:
			"Note content as plain text or HTML, depending on the selected format",
	},
	{
		displayName: "Initial Note Format",
		name: "initialNoteFormat",
		type: "options",
		options: [
			{ name: "Plain Text", value: "text/plain" },
			{ name: "HTML", value: "text/html" },
		],
		default: "text/plain",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["createDeal"],
				createInitialNote: [true],
			},
		},
		description: "Whether the initial note text is plain text or HTML",
	},
	// ===== UPDATE DEAL =====
	{
		displayName: "Deal Name or ID",
		name: "dealId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getDeals",
			reloadOptions: true,
		},
		required: true,
		default: "",
		description:
			'Pick a deal. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal", "getById"],
			},
		},
	},
	{
		displayName: "Deal Name",
		name: "name",
		type: "string",
		displayOptions: { show: { resource: ["deal"], operation: ["updateDeal"] } },
		default: "",
		description: "Name of the Deal",
	},
	{
		displayName: "Email",
		name: "email",
		type: "string",
		required: true,
		placeholder: "contact@example.com",
		displayOptions: {
			show: { resource: ["deal"], operation: ["findDealsByEmail"] },
		},
		default: "",
		description:
			"Email address of the contact whose related deals should be returned",
	},
	{
		displayName: "Return All",
		name: "returnAll",
		type: "boolean",
		default: true,
		description: "Whether to return all results or only up to a given limit",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["findDealsByEmail"],
			},
		},
	},
	{
		displayName: "Update Deal Pipeline/Phase?",
		name: "updatePipelineStage",
		type: "boolean",
		default: false,
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal"],
			},
		},
	},
	{
		displayName: "Pipeline Name or ID",
		name: "pipelineId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getPipelines" },
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal"],
				updatePipelineStage: [true],
			},
		},
		default: "",
		description:
			'Pipeline to update the deal in. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Phase Name or ID",
		name: "phaseId",
		type: "options",
		default: "",
		typeOptions: {
			loadOptionsMethod: "getStagesByPipeline",
			loadOptionsDependsOn: ["pipelineId"],
			reloadOptions: true,
		},
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal"],
				updatePipelineStage: [true],
			},
		},
		description:
			'Phase within the selected pipeline. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Append Values to Multi-Select Fields?",
		name: "appendMultiSelectValues",
		type: "boolean",
		displayOptions: { show: { resource: ["deal"], operation: ["updateDeal"] } },
		default: false,
		description:
			"Whether to append new multi-select values instead of replacing existing values",
	},
	// UPDATE – Mapper
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		default: { mappingMode: "defineBelow", value: null },
		noDataExpression: true,
		displayOptions: { show: { resource: ["deal"], operation: ["updateDeal"] } },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getDealResourceMapperFieldsForUpdate",
				mode: "add",
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
				fieldWords: { singular: "field", plural: "fields" },
			},
		},
		description:
			"Fields to update. Leave fields empty to keep their current value.",
	},

	// Initial Note (optional) bei UPDATE
	{
		displayName: "Also Create Initial Note?",
		name: "createInitialNote",
		type: "boolean",
		displayOptions: { show: { resource: ["deal"], operation: ["updateDeal"] } },
		default: false,
		description:
			"Whether if enabled, a note will be created right after the deal is updated",
	},
	{
		displayName: "Initial Note Text",
		name: "initialNoteText",
		type: "string",
		typeOptions: { rows: 4 },
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal"],
				createInitialNote: [true],
			},
		},
		default: "",
		description:
			"Note content as plain text or HTML, depending on the selected format",
	},
	{
		displayName: "Initial Note Format",
		name: "initialNoteFormat",
		type: "options",
		options: [
			{ name: "Plain Text", value: "text/plain" },
			{ name: "HTML", value: "text/html" },
		],
		default: "text/plain",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["updateDeal"],
				createInitialNote: [true],
			},
		},
		description: "Whether the initial note text is plain text or HTML",
	},
	// ===== LIST DEALS =====
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		displayOptions: { show: { resource: ["deal"], operation: ["listDeals"] } },
	},
	{
		displayName: "Pipeline Name or ID",
		name: "pipelineId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getPipelines" },
		default: "",
		displayOptions: { show: { resource: ["deal"], operation: ["listDeals"] } },
		description:
			'Optional pipeline filter. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		default: 25,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ["deal"], operation: ["listDeals"] } },
	},

	// ===== GET DEALS BY PIPELINE STAGE =====
	{
		displayName: "Pipeline Name or ID",
		name: "pipelineId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getPipelines" },
		displayOptions: {
			show: { resource: ["deal"], operation: ["getDealsByPipelinePhase"] },
		},
		required: true,
		default: "",
		description:
			'Pipeline to filter deals from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Phase Name or ID",
		name: "phaseId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getStagesByPipeline",
			loadOptionsDependsOn: ["pipelineId"],
			reloadOptions: true,
		},
		displayOptions: {
			show: { resource: ["deal"], operation: ["getDealsByPipelinePhase"] },
		},
		required: true,
		default: "",
		description:
			'Phase to filter deals by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ===== GET DEALS BY CONTACT ID =====
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		required: true,
		default: "",
		displayOptions: {
			show: { resource: ["deal"], operation: ["getDealsByContactId"] },
		},
		description:
			'Contact whose deals should be returned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Return All",
		name: "returnAll",
		type: "boolean",
		default: true,
		description: "Whether to return all results or only up to a given limit",
		displayOptions: {
			show: { resource: ["deal"], operation: ["getDealsByContactId"] },
		},
	},
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		typeOptions: { minValue: 0 },
		description: "Page number to fetch (0-based)",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["getDealsByContactId"],
				returnAll: [false],
			},
		},
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		default: 25,
		typeOptions: { minValue: 1 },
		description: "Number of deals to return per page",
		displayOptions: {
			show: {
				resource: ["deal"],
				operation: ["getDealsByContactId"],
				returnAll: [false],
			},
		},
	},
	{
		displayName: "Additional Options",
		name: "additionalOptions",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: { resource: ["deal"], operation: ["getDealsByContactId"] },
		},
		options: [
			{
				displayName: "Pipeline Name or ID",
				name: "pipelineId",
				type: "options",
				typeOptions: { loadOptionsMethod: "getPipelines" },
				default: "",
				description:
					'Filter deals by pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	// ===== CHANGE DEAL PIPELINE PHASE =====
	{
		displayName: "Deal Name or ID",
		name: "dealId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getDeals",
			reloadOptions: true,
		},
		required: true,
		default: "",
		description:
			'Deal to move. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ["deal"], operation: ["changeDealPipelinePhase"] },
		},
	},
	{
		displayName: "Pipeline Name or ID",
		name: "pipelineId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getPipelines" },
		required: true,
		default: "",
		description:
			'Target pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ["deal"], operation: ["changeDealPipelinePhase"] },
		},
	},
	{
		displayName: "Phase Name or ID",
		name: "phaseId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getStagesByPipeline",
			loadOptionsDependsOn: ["pipelineId"],
			reloadOptions: true,
		},
		required: true,
		default: "",
		description:
			'Target phase. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ["deal"], operation: ["changeDealPipelinePhase"] },
		},
	},
];
