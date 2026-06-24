import type { INodeProperties } from "n8n-workflow";

export const contactOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["contact"] } },
		options: [
			{
				name: "Create Contact",
				value: "createContact",
				description: "Create a new contact (no upsert)",
				action: "Create a contact",
			},
			{
				name: "Find Contact by Email",
				value: "getByEmail",
				description: "Find a contact by email address",
				action: "Find contact by email",
			},
			{
				name: "Get All Contacts",
				value: "getAllContacts",
				description: "Fetch all contacts (auto-paginated)",
				action: "Get all contacts",
			},
			{
				name: "Get Contact by ID",
				value: "getContactById",
				description: "Get a contact by contact ID",
				action: "Get contact by ID",
			},
			{
				name: "List Contacts",
				value: "listContacts",
				description: "List contacts with pagination",
				action: "List contacts",
			},
			{
				name: "Search Contacts",
				value: "searchContacts",
				description: "Search contacts by text",
				action: "Search contacts",
			},
			{
				name: "Update Contact (by ID)",
				value: "updateContact",
				description: "Update a contact by ID",
				action: "Update a contact by ID",
			},
			{
				name: "Upsert Contact (by Email)",
				value: "upsertContact",
				description: "Find by email, update if found, otherwise create",
				action: "Upsert a contact",
			},
		],
		default: "upsertContact",
	},
];

export const contactFields: INodeProperties[] = [
	// ===== CREATE =====
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		default: { mappingMode: "defineBelow", value: null },
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: { resource: ["contact"], operation: ["createContact"] },
		},
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getContactResourceMapperFields",
				mode: "add",
				fieldWords: { singular: "field", plural: "fields" },
				addAllFields: true,
				multiKeyMatch: true,
				supportAutoMap: false,
			},
		},
		description: "All available contact fields from your account",
	},
	// Optional initial note
	{
		displayName: "Also Create Initial Note?",
		name: "createInitialNote",
		type: "boolean",
		default: false,
		displayOptions: {
			show: { resource: ["contact"], operation: ["createContact"] },
		},
	},
	{
		displayName: "Initial Note Text",
		name: "initialNoteText",
		type: "string",
		typeOptions: { rows: 4 },
		default: "",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["createContact"],
				createInitialNote: [true],
			},
		},
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
				resource: ["contact"],
				operation: ["createContact"],
				createInitialNote: [true],
			},
		},
		description: "Whether the initial note text is plain text or HTML",
	},
	// ===== UPDATE =====
	{
		displayName: "Contact Name or ID",
		name: "contactId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getContacts" },
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["updateContact", "getContactById"],
			},
		},
		description:
			'Choose the contact to update. Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: "Allow Changing Email?",
		name: "allowChangeEmail",
		type: "boolean",
		default: false,
		displayOptions: {
			show: { resource: ["contact"], operation: ["updateContact"] },
		},
	},
	{
		displayName: "Append Values to Multi-Select Fields?",
		name: "appendMultiSelectValues",
		type: "boolean",
		default: false,
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["updateContact", "upsertContact"],
			},
		},
		description:
			"Whether to append new multi-select values instead of replacing existing values",
	},
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		noDataExpression: true,
		default: { mappingMode: "defineBelow", value: null },
		required: true,
		displayOptions: {
			show: { resource: ["contact"], operation: ["updateContact"] },
		},
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getContactResourceMapperFieldsForUpdate",
				mode: "add",
				fieldWords: { singular: "field", plural: "fields" },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	// Optional note after update
	{
		displayName: "Also Create Note?",
		name: "createInitialNote",
		type: "boolean",
		default: false,
		displayOptions: {
			show: { resource: ["contact"], operation: ["updateContact"] },
		},
	},
	{
		displayName: "Note Text",
		name: "initialNoteText",
		type: "string",
		typeOptions: { rows: 4 },
		default: "",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["updateContact"],
				createInitialNote: [true],
			},
		},
	},
	{
		displayName: "Note Format",
		name: "initialNoteFormat",
		type: "options",
		options: [
			{ name: "Plain Text", value: "text/plain" },
			{ name: "HTML", value: "text/html" },
		],
		default: "text/plain",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["updateContact"],
				createInitialNote: [true],
			},
		},
		description: "Whether the note text is plain text or HTML",
	},
	// ===== UPSERT =====
	{
		displayName:
			"Upsert matches on Contact Person email first, then Contact email.",
		name: "upsertInfo",
		type: "notice",
		default: "",
		displayOptions: {
			show: { resource: ["contact"], operation: ["upsertContact"] },
		},
	},
	{
		displayName: "Match Strategy",
		name: "upsertMatchStrategy",
		type: "options",
		default: "errorOnMultiple",
		description:
			"How to choose the contact to update when the email matches more than one contact",
		options: [
			{
				name: "Error if Ambiguous",
				value: "errorOnMultiple",
				description:
					"Throw an error if the email matches more than one contact",
			},
			{
				name: "Prefer Main Contact Person",
				value: "preferMainContactPerson",
				description:
					"Only consider contacts whose main contact person uses the email; error if still ambiguous",
			},
			{
				name: "Use First Match",
				value: "firstMatch",
				description: "Update the first matched contact (legacy behavior)",
			},
		],
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["upsertContact"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Fields (for Create or Update)",
		name: "fields",
		type: "resourceMapper",
		noDataExpression: true,
		default: { mappingMode: "defineBelow", value: null },
		required: true,
		displayOptions: {
			show: { resource: ["contact"], operation: ["upsertContact"] },
		},
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getContactResourceMapperFieldsForUpsert",
				mode: "upsert",
				fieldWords: { singular: "field", plural: "fields" },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},

	// ===== OTHER OPS =====
	{
		displayName: "Email",
		name: "email",
		type: "string",
		placeholder: "name@email.com",
		default: "",
		required: true,
		displayOptions: {
			show: { resource: ["contact"], operation: ["getByEmail"] },
		},
	},
	{
		displayName:
			"Returns every contact that uses this email — whether on the main or an additional contact person. Multiple contacts may be returned.",
		name: "getByEmailV2Info",
		type: "notice",
		default: "",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["getByEmail"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Only Main Contact Person Matches?",
		name: "onlyMainContactPerson",
		type: "boolean",
		default: false,
		description:
			"Whether to only return contacts where the email belongs to the main contact person",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["getByEmail"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Fail If Not Found",
		name: "failIfNotFound",
		type: "boolean",
		default: false,
		displayOptions: {
			show: { resource: ["contact"], operation: ["getByEmail"] },
		},
		description:
			"Whether to throw an error if no contact is found for the given email",
	},
	{
		displayName: "Search String",
		name: "searchString",
		type: "string",
		default: "",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [1],
			},
		},
	},
	// ===== SEARCH CONTACTS (v2) =====
	{
		displayName:
			"Search uses a saved filter (Filter ID) or inline filter groups. Leave both empty to return all contacts.",
		name: "searchV2Info",
		type: "notice",
		default: "",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Filter ID",
		name: "filterId",
		type: "string",
		default: "",
		description:
			"ID of a saved contact filter. Provide either Filter ID or Filter Groups.",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Filter Groups (JSON)",
		name: "orFilterGroups",
		type: "json",
		default: "[]",
		description:
			'Inline OR filter groups. Array of objects shaped like { "andFilterItems": [{ "propertyIdentification": "contact_companyName", "condition": { "type": "string", "check": "contains", "value": "GmbH" } }] }.',
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Order By (JSON)",
		name: "orderBy",
		type: "json",
		default: "[]",
		description:
			'Array of sort items shaped like { "propertyIdentification": "contact_createdAt", "sortOrder": "desc", "nulls": "last" }',
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		default: 25,
		typeOptions: { minValue: 1 },
		description: "Max number of results to return",
		displayOptions: {
			show: {
				resource: ["contact"],
				operation: ["searchContacts"],
				"@version": [2],
			},
		},
	},
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		displayOptions: {
			show: { resource: ["contact"], operation: ["listContacts"] },
		},
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		description: "Max number of results to return",
		default: 25,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { resource: ["contact"], operation: ["listContacts"] },
		},
	},
];
