import { INodeProperties } from "n8n-workflow";

export const activityOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["activity"] } },
		options: [
			{
				name: "Create Note",
				value: "createNote",
				action: "Create note on contact or deal",
				description: "Add an internal note to a contact or deal",
			},
			{
				name: "Get Call Type by ID",
				value: "getCallTypeById",
				action: "Get call type by ID",
				description: "Retrieve a single call type by its ID",
			},
			{
				name: "List Call Types",
				value: "listCallTypes",
				action: "List call types",
				description:
					"Retrieve all available phone call types including their category",
			},
			{
				name: "List Email Activities",
				value: "listEmailActivities",
				action: "List contact emails",
				description: "Retrieve a history of emails for the selected contact",
			},
			{
				name: "List Phone Call Activities",
				value: "listPhoneCallActivities",
				action: "List phone call activities",
				description:
					"Retrieve logged phone call activities for a contact or deal",
			},
		],
		default: "createNote",
	},
];

export const activityFields: INodeProperties[] = [
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["listEmailActivities"],
			},
		},
		description:
			'Choose the contact. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// Get Call Type by ID
	{
		displayName: "Call Type Name or ID",
		name: "callTypeId",
		type: "options",
		typeOptions: { loadOptionsMethod: "loadPhoneCallActivityTypes" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["getCallTypeById"],
			},
		},
		description:
			'Choose the call type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// Create Note
	{
		displayName: "Attach Note To",
		name: "noteTarget",
		type: "options",
		options: [
			{ name: "Contact", value: "contact" },
			{ name: "Deal", value: "deal" },
		],
		default: "contact",
		displayOptions: {
			show: { resource: ["activity"], operation: ["createNote"] },
		},
	},
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["createNote"],
				noteTarget: ["contact"],
			},
		},
		description:
			'Choose the contact. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Deal Name or ID",
		name: "dealId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getDeals", reloadOptions: true },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["createNote"],
				noteTarget: ["deal"],
			},
		},
		description:
			'Choose the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Note Text",
		name: "noteText",
		type: "string",
		typeOptions: { rows: 4 },
		default: "",
		displayOptions: {
			show: { resource: ["activity"], operation: ["createNote"] },
		},
		description: "Plain text note",
	},
	// List Phone Call Activities
	{
		displayName: "Scope",
		name: "callScope",
		type: "options",
		options: [
			{ name: "Contact", value: "contact" },
			{ name: "Deal", value: "deal" },
		],
		default: "contact",
		displayOptions: {
			show: { resource: ["activity"], operation: ["listPhoneCallActivities"] },
		},
		description: "Whether to retrieve call activities for a contact or a deal",
	},
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["listPhoneCallActivities"],
				callScope: ["contact"],
			},
		},
		description:
			'Choose the contact. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Deal Name or ID",
		name: "dealId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getDeals", reloadOptions: true },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["activity"],
				operation: ["listPhoneCallActivities"],
				callScope: ["deal"],
			},
		},
		description:
			'Choose the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// List Call Activities Filters
	{
		displayName: "Call Type Name or ID",
		name: "phoneCallActivityTypeId",
		type: "options",
		typeOptions: { loadOptionsMethod: "loadPhoneCallActivityTypes" },
		default: "any",
		displayOptions: {
			show: { resource: ["activity"], operation: ["listPhoneCallActivities"] },
		},
		description:
			'Optional filter by call type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Call Result Name or ID",
		name: "callResult",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "loadCallResultTypes",
			loadOptionsDependsOn: ["phoneCallActivityTypeId"],
		},
		default: "any",
		displayOptions: {
			show: { resource: ["activity"], operation: ["listPhoneCallActivities"] },
		},
		description:
			'Optional filter by call result. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
