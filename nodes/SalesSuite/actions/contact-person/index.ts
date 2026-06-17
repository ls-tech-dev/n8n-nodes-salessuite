import type { INodeProperties } from "n8n-workflow";

export const contactPersonOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["contactPerson"] } },
		options: [
			{
				name: "Create Contact Person",
				value: "create",
				description: "Create a new contact person on a contact",
				action: "Create a contact person",
			},
			{
				name: "Delete Contact Person",
				value: "delete",
				description: "Delete a contact person",
				action: "Delete a contact person",
			},
			{
				name: "Get ContactPerson by ID",
				value: "getContactPersonById",
				description:
					"Retrieves a single Contact Person with the related Contact",
				action: "Get contact person by ID",
			},
			{
				name: "Set Main Contact Person",
				value: "setMainContactPerson",
				description:
					"Make this contact person the main contact person of its contact",
				action: "Set main contact person",
			},
			{
				name: "Update Contact Person",
				value: "update",
				description: "Update an existing contact person",
				action: "Update a contact person",
			},
		],
		default: "getContactPersonById",
	},
];

export const contactPersonFields: INodeProperties[] = [
	// ===== CREATE =====
	{
		displayName: "Contact ID",
		name: "contactId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["create"] },
		},
		description: "ID des Kontakts, dem die Kontaktperson zugeordnet wird",
	},
	{
		displayName: "Make Main Contact Person?",
		name: "makeMainContactPerson",
		type: "boolean",
		default: false,
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["create"] },
		},
		description:
			"Whether this contact person becomes the main contact person of the contact",
	},
	{
		displayName:
			"Only Contact Person fields are sent; contact fields are ignored.",
		name: "contactPersonCreateInfo",
		type: "notice",
		default: "",
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["create"] },
		},
	},
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		default: { mappingMode: "defineBelow", value: null },
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["create"] },
		},
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getContactPersonResourceMapperFields",
				mode: "add",
				fieldWords: { singular: "field", plural: "fields" },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
		description: "Email is required",
	},

	// ===== SHARED ID (get / update / delete / setMain) =====
	{
		displayName: "Contact Person ID",
		name: "contactPersonId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["contactPerson"],
				operation: [
					"getContactPersonById",
					"update",
					"delete",
					"setMainContactPerson",
				],
			},
		},
		description: "ID der Kontaktperson",
	},

	// ===== UPDATE =====
	{
		displayName:
			"Only Contact Person fields are sent; contact fields are ignored.",
		name: "contactPersonUpdateInfo",
		type: "notice",
		default: "",
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["update"] },
		},
	},
	{
		displayName: "Fields",
		name: "fields",
		type: "resourceMapper",
		default: { mappingMode: "defineBelow", value: null },
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: { resource: ["contactPerson"], operation: ["update"] },
		},
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: "getContactPersonResourceMapperFieldsForUpdate",
				mode: "add",
				fieldWords: { singular: "field", plural: "fields" },
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
		description:
			"Fields to update. Leave fields empty to keep their current value.",
	},
];
