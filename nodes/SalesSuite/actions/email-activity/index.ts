import type { INodeProperties } from "n8n-workflow";

export const emailActivityOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["emailActivity"] } },
		options: [
			{
				name: "Delete Email Activity",
				value: "deleteEmailActivity",
				action: "Delete an email activity",
				description: "Delete an email activity by ID",
			},
			{
				name: "Get Email Activity by ID",
				value: "getEmailActivityById",
				action: "Get an email activity by ID",
				description: "Fetch an email activity by its ID",
			},
			{
				name: "List Email Activities",
				value: "listEmailActivities",
				action: "List email activities",
				description: "List email activities for a contact or deal",
			},
			{
				name: "List Email Activity Feed",
				value: "listEmailActivityFeed",
				action: "List email activity feed",
				description:
					"List email activities for a contact or deal with cursor pagination",
			},
			{
				name: "Log Email Activity",
				value: "createLoggedEmailActivity",
				action: "Log an email activity",
				description: "Create a logged email activity",
			},
		],
		default: "listEmailActivities",
	},
];

export const emailActivityFields: INodeProperties[] = [
	{
		displayName: "Attach To",
		name: "emailTarget",
		type: "options",
		options: [
			{ name: "Contact", value: "contact" },
			{ name: "Deal", value: "deal" },
		],
		default: "contact",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: [
					"createLoggedEmailActivity",
					"listEmailActivities",
					"listEmailActivityFeed",
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
		description:
			'Choose the contact. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: [
					"createLoggedEmailActivity",
					"listEmailActivities",
					"listEmailActivityFeed",
				],
				emailTarget: ["contact"],
			},
		},
	},
	{
		displayName: "Deal Name or ID",
		name: "dealId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getDeals", reloadOptions: true },
		required: true,
		default: "",
		description:
			'Choose the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: [
					"createLoggedEmailActivity",
					"listEmailActivities",
					"listEmailActivityFeed",
				],
				emailTarget: ["deal"],
			},
		},
	},
	{
		displayName: "Email Activity ID",
		name: "emailActivityId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["deleteEmailActivity", "getEmailActivityById"],
			},
		},
	},
	{
		displayName: "From",
		name: "from",
		type: "string",
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description: "Sender email address",
	},
	{
		displayName: "To",
		name: "to",
		type: "string",
		typeOptions: { rows: 3 },
		required: true,
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description: "Comma or newline separated recipient addresses",
	},
	{
		displayName: "CC",
		name: "cc",
		type: "string",
		typeOptions: { rows: 2 },
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description: "Optional comma or newline separated CC addresses",
	},
	{
		displayName: "BCC",
		name: "bcc",
		type: "string",
		typeOptions: { rows: 2 },
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description: "Optional comma or newline separated BCC addresses",
	},
	{
		displayName: "Subject",
		name: "subject",
		type: "string",
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
	},
	{
		displayName: "Content",
		name: "content",
		type: "string",
		typeOptions: { rows: 6 },
		required: true,
		default: "",
		placeholder: "<p>Hello Jane Doe</p>",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description:
			"Email content as an HTML string. Plain text is not auto-formatted, so wrap each line in HTML (e.g. <p>…</p>) for correct rendering.",
	},
	{
		displayName: "Email Sent At",
		name: "emailSentAt",
		type: "dateTime",
		default: "",
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["createLoggedEmailActivity"],
			},
		},
		description: "Optional date and time the email was sent (ISO 8601)",
	},
	{
		displayName: "Limit",
		name: "limit",
		type: "number",
		default: 50,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: {
			show: {
				resource: ["emailActivity"],
				operation: ["listEmailActivities", "listEmailActivityFeed"],
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
				resource: ["emailActivity"],
				operation: ["listEmailActivities", "listEmailActivityFeed"],
			},
		},
	},
];
