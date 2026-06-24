import type { INodeProperties } from "n8n-workflow";

export const callActivityOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["callActivity"] } },
		options: [
			{
				name: "Create Call Activity",
				value: "createCallActivity",
				action: "Create a call activity",
				description: "Create a logged call activity",
			},
			{
				name: "Delete Call Activity",
				value: "deleteCallActivity",
				action: "Delete a call activity",
				description: "Delete a call activity by ID",
			},
			{
				name: "Get Call Activity by ID",
				value: "getCallActivityById",
				action: "Get a call activity by ID",
				description: "Fetch a call activity by its ID",
			},
			{
				name: "Get Call Type by ID",
				value: "getCallTypeById",
				action: "Get call type by ID",
				description: "Retrieve a single call type by its ID",
			},
			{
				name: "List Call Activities",
				value: "listCallActivities",
				action: "List call activities",
				description: "List call activities for a contact or deal",
			},
			{
				name: "List Call Activity Feed",
				value: "listCallActivityFeed",
				action: "List call activity feed",
				description:
					"List call activities for a contact or deal with cursor pagination",
			},
			{
				name: "List Call Types",
				value: "listCallTypes",
				action: "List call types",
				description:
					"Retrieve all available phone call types including their category",
			},
		],
		default: "listCallActivities",
	},
];

export const callActivityFields: INodeProperties[] = [
	{
		displayName: "Attach To",
		name: "callTarget",
		type: "options",
		options: [
			{ name: "Contact", value: "contact" },
			{ name: "Deal", value: "deal" },
		],
		default: "contact",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: [
					"createCallActivity",
					"listCallActivities",
					"listCallActivityFeed",
				],
			},
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
				resource: ["callActivity"],
				operation: [
					"createCallActivity",
					"listCallActivities",
					"listCallActivityFeed",
				],
				callTarget: ["contact"],
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
				resource: ["callActivity"],
				operation: [
					"createCallActivity",
					"listCallActivities",
					"listCallActivityFeed",
				],
				callTarget: ["deal"],
			},
		},
		description:
			'Choose the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Call Activity ID",
		name: "callActivityId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["deleteCallActivity", "getCallActivityById"],
			},
		},
		description: "ID of the call activity",
	},
	{
		displayName: "Call Type Name or ID",
		name: "callTypeId",
		type: "options",
		typeOptions: { loadOptionsMethod: "loadPhoneCallActivityTypes" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity", "getCallTypeById"],
			},
		},
		description:
			'Choose the call type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Caller User Name or ID",
		name: "callerUserId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getUsers" },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description:
			'Choose the user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Called Contact Person Name or ID",
		name: "calleeContactPersonId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getCalleeContactPersons",
			loadOptionsDependsOn: ["callTarget", "contactId", "dealId"],
			reloadOptions: true,
		},
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description:
			'Optional contact person (main or additional) of the call target. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Call Started At",
		name: "callStartedAt",
		type: "dateTime",
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description: "Optional date and time the call started (ISO 8601)",
	},
	{
		displayName: "Duration Sec",
		name: "durationSec",
		type: "number",
		default: 0,
		typeOptions: { minValue: 0 },
		required: true,
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description: "Call duration in seconds",
	},
	{
		displayName: "Call Result Name or ID",
		name: "callResult",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "loadCallResultTypes",
			loadOptionsDependsOn: ["callTypeId"],
		},
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description:
			'Choose the call result. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Caller Phone Number",
		name: "callerPhoneNumber",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
	},
	{
		// This field is a dynamic dropdown of the contact persons' phone numbers, not
		// an entity Name/ID selector, so the standard "Name or ID" naming and the
		// "specify an ID" description do not apply here.
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: "Callee Phone Number",
		name: "calleePhoneNumber",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getCalleePhoneNumbers",
			loadOptionsDependsOn: [
				"callTarget",
				"contactId",
				"dealId",
				"calleeContactPersonId",
			],
			reloadOptions: true,
		},
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Phone number of the called contact person. Choose from the list, or specify a number using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Notes",
		name: "notes",
		type: "string",
		typeOptions: { rows: 4 },
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description: "Optional HTML note content",
	},
	{
		displayName: "Call Device ID",
		name: "userCallDeviceId",
		type: "string",
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["createCallActivity"],
			},
		},
		description: "Optional call device ID",
	},
	{
		displayName: "Limit",
		name: "limit",
		type: "number",
		default: 50,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["listCallActivities", "listCallActivityFeed"],
			},
		},
		description: "Max number of results to return",
	},
	{
		displayName: "Cursor",
		name: "cursor",
		type: "string",
		default: "",
		displayOptions: {
			show: {
				resource: ["callActivity"],
				operation: ["listCallActivities", "listCallActivityFeed"],
			},
		},
	},
];
