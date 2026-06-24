import type { INodeProperties } from "n8n-workflow";

export const noteOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["note"] } },
		options: [
			{
				name: "Create Note",
				value: "createNote",
				action: "Create a note",
				description: "Create a note on a contact or deal",
			},
			{
				name: "Delete Note",
				value: "deleteNote",
				action: "Delete a note",
				description: "Delete a note by ID",
			},
			{
				name: "Get Note by ID",
				value: "getNoteById",
				action: "Get a note by ID",
				description: "Fetch a note by its ID",
			},
			{
				name: "List Note Feed",
				value: "listNoteFeed",
				action: "List note feed",
				description: "List notes for a contact or deal with cursor pagination",
			},
			{
				name: "List Notes",
				value: "listNotes",
				action: "List notes",
				description: "List notes directly attached to a contact or deal",
			},
		],
		default: "getNoteById",
	},
];

export const noteFields: INodeProperties[] = [
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
			show: {
				resource: ["note"],
				operation: ["createNote", "listNoteFeed", "listNotes"],
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
				resource: ["note"],
				operation: ["createNote", "listNoteFeed", "listNotes"],
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
				resource: ["note"],
				operation: ["createNote", "listNoteFeed", "listNotes"],
				noteTarget: ["deal"],
			},
		},
		description:
			'Choose the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Format",
		name: "noteFormat",
		type: "options",
		options: [
			{ name: "Plain Text", value: "text/plain" },
			{ name: "HTML", value: "text/html" },
		],
		default: "text/plain",
		displayOptions: {
			show: { resource: ["note"], operation: ["createNote"] },
		},
		description: "Whether the note text is plain text or HTML",
	},
	{
		displayName: "Note Text",
		name: "noteText",
		type: "string",
		typeOptions: { rows: 4 },
		default: "",
		displayOptions: {
			show: { resource: ["note"], operation: ["createNote"] },
		},
		description:
			"Note content as plain text or HTML, depending on the selected format",
	},
	{
		displayName: "Note ID",
		name: "noteId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: { resource: ["note"], operation: ["deleteNote", "getNoteById"] },
		},
		description: "ID of the note",
	},
	{
		displayName: "Limit",
		name: "limit",
		type: "number",
		default: 50,
		typeOptions: { minValue: 1, maxValue: 100 },
		displayOptions: {
			show: { resource: ["note"], operation: ["listNoteFeed", "listNotes"] },
		},
		description: "Max number of results to return",
	},
	{
		displayName: "Cursor",
		name: "cursor",
		type: "string",
		default: "",
		displayOptions: {
			show: { resource: ["note"], operation: ["listNoteFeed", "listNotes"] },
		},
		description: "Opaque cursor for the next page of notes",
	},
];
