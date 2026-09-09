import type { INodeProperties } from "n8n-workflow";

type ShowCondition = NonNullable<INodeProperties["displayOptions"]>["show"];

export type SearchFilterFieldOptions = {
	resource: string;
	operation: string;
	versions?: number[];
	extraFields?: INodeProperties[];
	entityPlural: string;
};

// Shipped as the field's default, not as a placeholder: n8n renders no placeholder
// on a json field. Clearing the field applies no filter.
const SEARCH_FILTER_GROUPS_EXAMPLE = [
	"[",
	"  {",
	'    "andFilterItems": [',
	"      {",
	'        "propertyIdentification": "contactPerson_email",',
	'        "condition": {',
	'          "type": "string",',
	'          "check": "contains",',
	'          "value": "@example.com"',
	"        }",
	"      }",
	"    ]",
	"  }",
	"]",
].join("\n");

const IS_STRING: ShowCondition = {
	conditionMode: ["builder"],
	property: [{ _cnd: { includes: "::string::" } }],
};
const IS_NUMBER: ShowCondition = {
	conditionMode: ["builder"],
	property: [{ _cnd: { includes: "::number::" } }],
};
const IS_BOOLEAN: ShowCondition = {
	conditionMode: ["builder"],
	property: [{ _cnd: { includes: "::boolean::" } }],
};
const IS_DATETIME: ShowCondition = {
	conditionMode: ["builder"],
	property: [{ _cnd: { includes: "::dateTime::" } }],
};
const IS_SELECT: ShowCondition = {
	conditionMode: ["builder"],
	property: [{ _cnd: { includes: "::select::" } }],
};

const SELECT_OPERATORS_WITH_VALUE = [
	"containsAllOf",
	"containsOneOf",
	"doesNotContain",
	"equals",
];

function makeDatePointFields(options: {
	namePrefix: string;
	labelPrefix: string;
	includeXDays: boolean;
	show: ShowCondition;
}): INodeProperties[] {
	const { namePrefix, labelPrefix, includeXDays, show } = options;
	const modeName = `${namePrefix}Mode`;

	const modeOptions: INodeProperties["options"] = [
		{
			name: "Exact Date",
			value: "exact",
			description: "A fixed point in time",
		},
		...(includeXDays
			? [
					{
						name: "Number of Days From Now",
						value: "xDays",
						description: "Matches the day exactly N days from now (xDays)",
					},
				]
			: []),
		{
			name: "Relative Days",
			value: "glidingDays",
			description: "Gliding date with an explicit day count",
		},
		{
			name: "Relative Preset",
			value: "glidingPreset",
			description: "Today, tomorrow, yesterday or 7 to 180 days",
		},
	];

	return [
		{
			displayName: `${labelPrefix}Date Mode`,
			name: modeName,
			type: "options",
			options: modeOptions,
			default: "exact",
			displayOptions: { show },
		},
		{
			displayName: `${labelPrefix}Exact Date`,
			name: `${namePrefix}Exact`,
			type: "dateTime",
			default: "",
			description: "Leave empty to send an explicit null date point",
			displayOptions: { show: { ...show, [modeName]: ["exact"] } },
		},
		{
			displayName: `${labelPrefix}Relative Preset`,
			name: `${namePrefix}GlidingPreset`,
			type: "options",
			options: [
				{ name: "14 Days", value: "14days" },
				{ name: "180 Days", value: "180days" },
				{ name: "30 Days", value: "30days" },
				{ name: "60 Days", value: "60days" },
				{ name: "7 Days", value: "7days" },
				{ name: "90 Days", value: "90days" },
				{ name: "Today", value: "today" },
				{ name: "Tomorrow", value: "tomorrow" },
				{ name: "Yesterday", value: "yesterday" },
			],
			default: "today",
			displayOptions: { show: { ...show, [modeName]: ["glidingPreset"] } },
		},
		{
			displayName: `${labelPrefix}Number of Days`,
			name: `${namePrefix}GlidingDays`,
			type: "number",
			typeOptions: { minValue: 1 },
			default: 7,
			displayOptions: { show: { ...show, [modeName]: ["glidingDays"] } },
		},
		...(includeXDays
			? ([
					{
						displayName: `${labelPrefix}Days From Now`,
						name: `${namePrefix}XDays`,
						type: "number",
						default: 0,
						displayOptions: { show: { ...show, [modeName]: ["xDays"] } },
					},
				] as INodeProperties[])
			: []),
	];
}

const conditionFields: INodeProperties[] = [
	{
		displayName: "Condition Mode",
		name: "conditionMode",
		type: "options",
		noDataExpression: true,
		options: [
			{
				name: "Builder",
				value: "builder",
				description: "Pick a property, an operator and a value",
			},
			{
				name: "Raw JSON Condition",
				value: "raw",
				description:
					"Supply the condition object verbatim. Sits in its group like any other condition.",
			},
		],
		default: "builder",
	},
	{
		displayName: "Property Name or ID",
		name: "property",
		type: "options",
		typeOptions: { loadOptionsMethod: "getSearchFilterProperties" },
		default: "",
		description:
			'Property to filter on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { conditionMode: ["builder"] } },
	},

	{
		displayName: "Property Name or ID",
		name: "rawPropertyIdentification",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getSearchPropertyIdentifiers",
		},
		default: "",
		description:
			'Property to filter on; the condition below carries its own type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { conditionMode: ["raw"] } },
	},
	{
		displayName: "Condition (JSON)",
		name: "rawCondition",
		type: "json",
		default: '{\n  "type": "string",\n  "check": "contains",\n  "value": ""\n}',
		description:
			'Condition object exactly as the API expects it, for example { "type": "dateTime", "check": "equals", "value": { "glidingInterval": "thisQuarter" } }',
		displayOptions: { show: { conditionMode: ["raw"] } },
	},

	{
		displayName: "Operator",
		name: "stringOperator",
		type: "options",
		options: [
			{ name: "Contains", value: "contains" },
			{ name: "Does Not Contain", value: "doesNotContain" },
			{ name: "Does Not Equal", value: "doesNotEqual" },
			{ name: "Ends With", value: "endsWith" },
			{ name: "Equals", value: "equals" },
			{ name: "Is Empty (Null)", value: "isNull" },
			{ name: "Is Not Empty (Not Null)", value: "isNotNull" },
			{ name: "Starts With", value: "startsWith" },
		],
		default: "contains",
		displayOptions: { show: IS_STRING },
	},
	{
		displayName: "Value",
		name: "stringValue",
		type: "string",
		default: "",
		displayOptions: {
			show: {
				...IS_STRING,
				stringOperator: [
					"contains",
					"doesNotContain",
					"doesNotEqual",
					"endsWith",
					"equals",
					"startsWith",
				],
			},
		},
	},

	{
		displayName: "Operator",
		name: "numberOperator",
		type: "options",
		options: [
			{ name: "Does Not Equal", value: "doesNotEqual" },
			{ name: "Equals", value: "equals" },
			{ name: "Is Between", value: "isBetween" },
			{ name: "Is Empty (Null)", value: "isNull" },
			{ name: "Is Greater Than", value: "isGreaterThan" },
			{ name: "Is Less Than", value: "isLessThan" },
			{ name: "Is Not Empty (Not Null)", value: "isNotNull" },
		],
		default: "equals",
		displayOptions: { show: IS_NUMBER },
	},
	{
		displayName: "Value",
		name: "numberValue",
		type: "number",
		default: 0,
		displayOptions: {
			show: {
				...IS_NUMBER,
				numberOperator: [
					"doesNotEqual",
					"equals",
					"isGreaterThan",
					"isLessThan",
				],
			},
		},
	},
	{
		displayName: "From",
		name: "numberFrom",
		type: "number",
		default: 0,
		displayOptions: { show: { ...IS_NUMBER, numberOperator: ["isBetween"] } },
	},
	{
		displayName: "To",
		name: "numberTo",
		type: "number",
		default: 0,
		displayOptions: { show: { ...IS_NUMBER, numberOperator: ["isBetween"] } },
	},

	{
		displayName: "Operator",
		name: "booleanOperator",
		type: "options",
		options: [
			{ name: "Is Empty (Null)", value: "isNull" },
			{ name: "Is False", value: "isFalse" },
			{ name: "Is Not Empty (Not Null)", value: "isNotNull" },
			{ name: "Is True", value: "isTrue" },
		],
		default: "isTrue",
		displayOptions: { show: IS_BOOLEAN },
	},

	{
		displayName: "Operator",
		name: "selectOperator",
		type: "options",
		options: [
			{ name: "Contains All Of", value: "containsAllOf" },
			{ name: "Contains One Of", value: "containsOneOf" },
			{ name: "Does Not Contain", value: "doesNotContain" },
			{ name: "Equals", value: "equals" },
			{ name: "Is Empty", value: "isEmpty" },
			{ name: "Is Empty (Null)", value: "isNull" },
			{ name: "Is Not Empty", value: "isNotEmpty" },
			{ name: "Is Not Empty (Not Null)", value: "isNotNull" },
		],
		default: "containsOneOf",
		displayOptions: { show: IS_SELECT },
	},
	{
		displayName: "Value Source",
		name: "selectValueSource",
		type: "options",
		options: [
			{
				name: "Custom Keys",
				value: "custom",
				description:
					"Enter option keys manually. Required for country, gender and title selects, which expose no option list.",
			},
			{ name: "From List", value: "list" },
		],
		default: "list",
		displayOptions: {
			show: { ...IS_SELECT, selectOperator: SELECT_OPERATORS_WITH_VALUE },
		},
	},
	{
		displayName: "Values Names or IDs",
		name: "selectValues",
		type: "multiOptions",
		typeOptions: {
			loadOptionsMethod: "getSearchSelectOptions",
			loadOptionsDependsOn: ["&property"],
			reloadOptions: true,
		},
		default: [],
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				...IS_SELECT,
				selectOperator: SELECT_OPERATORS_WITH_VALUE,
				selectValueSource: ["list"],
			},
		},
	},
	{
		displayName: "Custom Values",
		name: "selectValuesCustom",
		type: "string",
		default: "",
		placeholder: "key-1, key-2",
		description:
			"Comma-separated option keys. Tenant-defined select keys are UUIDs.",
		displayOptions: {
			show: {
				...IS_SELECT,
				selectOperator: SELECT_OPERATORS_WITH_VALUE,
				selectValueSource: ["custom"],
			},
		},
	},

	{
		displayName: "Operator",
		name: "dateOperator",
		type: "options",
		options: [
			{ name: "Does Not Equal", value: "doesNotEqual" },
			{ name: "Does Not Equal (Interval)", value: "doesNotEqualInterval" },
			{ name: "Does Not Equal (Range)", value: "doesNotEqualRange" },
			{ name: "Equals", value: "equals" },
			{
				name: "Equals (Interval)",
				value: "equalsInterval",
				description:
					"Match a gliding interval such as this quarter or the last N days",
			},
			{
				name: "Equals (Range)",
				value: "equalsRange",
				description: "Match anything between a From and a To date point",
			},
			{ name: "Is After", value: "isAfter" },
			{ name: "Is Before", value: "isBefore" },
			{ name: "Is Between", value: "isBetween" },
			{ name: "Is Empty (Null)", value: "isNull" },
			{ name: "Is Not Empty (Not Null)", value: "isNotNull" },
		],
		default: "isAfter",
		displayOptions: { show: IS_DATETIME },
	},
	...makeDatePointFields({
		namePrefix: "dateAt",
		labelPrefix: "",
		includeXDays: true,
		show: { ...IS_DATETIME, dateOperator: ["isAfter", "isBefore"] },
	}),
	...makeDatePointFields({
		namePrefix: "dateEq",
		labelPrefix: "",
		includeXDays: false,
		show: { ...IS_DATETIME, dateOperator: ["doesNotEqual", "equals"] },
	}),
	{
		displayName: "Interval Mode",
		name: "dateIntervalMode",
		type: "options",
		options: [
			{ name: "Last N Days", value: "lastDays" },
			{ name: "Preset", value: "preset" },
		],
		default: "preset",
		displayOptions: {
			show: {
				...IS_DATETIME,
				dateOperator: ["doesNotEqualInterval", "equalsInterval"],
			},
		},
	},
	{
		displayName: "Interval Preset",
		name: "dateIntervalPreset",
		type: "options",
		options: [
			{ name: "This Month", value: "thisMonth" },
			{ name: "This Quarter", value: "thisQuarter" },
			{ name: "This Week", value: "thisWeek" },
			{ name: "This Year", value: "thisYear" },
		],
		default: "thisMonth",
		displayOptions: {
			show: {
				...IS_DATETIME,
				dateOperator: ["doesNotEqualInterval", "equalsInterval"],
				dateIntervalMode: ["preset"],
			},
		},
	},
	{
		displayName: "Number of Days",
		name: "dateIntervalLastDays",
		type: "number",
		typeOptions: { minValue: 1 },
		default: 30,
		displayOptions: {
			show: {
				...IS_DATETIME,
				dateOperator: ["doesNotEqualInterval", "equalsInterval"],
				dateIntervalMode: ["lastDays"],
			},
		},
	},
	...makeDatePointFields({
		namePrefix: "dateFrom",
		labelPrefix: "From ",
		includeXDays: true,
		show: {
			...IS_DATETIME,
			dateOperator: ["doesNotEqualRange", "equalsRange", "isBetween"],
		},
	}),
	...makeDatePointFields({
		namePrefix: "dateTo",
		labelPrefix: "To ",
		includeXDays: true,
		show: {
			...IS_DATETIME,
			dateOperator: ["doesNotEqualRange", "equalsRange", "isBetween"],
		},
	}),
];

export function makeSearchFilterFields(
	options: SearchFilterFieldOptions,
): INodeProperties[] {
	const { resource, operation, versions, extraFields, entityPlural } = options;
	const SHOW: ShowCondition = {
		resource: [resource],
		operation: [operation],
		...(versions ? { "@version": versions } : {}),
	};

	return [
		...(extraFields ?? []),
		{
			displayName: "Search Source",
			name: "searchSource",
			type: "options",
			noDataExpression: true,
			options: [
				{
					name: "Filter Builder",
					value: "builder",
					description: "Build filter conditions with the structured editor",
				},
				{
					name: "Raw JSON Filter Groups",
					value: "json",
					description: "Supply the orFilterGroups array as raw JSON",
				},
				{
					name: "Saved Filter ID",
					value: "filterId",
					description: "Use a filter saved in SalesSuite",
				},
			],
			default: "builder",
			displayOptions: { show: SHOW },
		},
		{
			displayName: "Filter ID",
			name: "filterId",
			type: "string",
			default: "",
			description:
				"ID of a saved filter. The API exposes no endpoint listing saved filters, so this has to be entered manually.",
			displayOptions: { show: { ...SHOW, searchSource: ["filterId"] } },
		},
		{
			displayName: "Filter Groups (JSON)",
			name: "orFilterGroupsJson",
			type: "json",
			default: SEARCH_FILTER_GROUPS_EXAMPLE,
			hint: "Example filter - replace it with your own, or clear the field to apply no filter",
			description:
				"Raw orFilterGroups array. Groups are combined with OR, the andFilterItems inside a group with AND.",
			displayOptions: { show: { ...SHOW, searchSource: ["json"] } },
		},
		{
			displayName: `Conditions inside one group are combined with AND. Separate groups are combined with OR. Leave the list empty to return all ${entityPlural}. Using an expression for a property shows every operator at once; the data type is then resolved when the node runs.`,
			name: "filterBuilderNotice",
			type: "notice",
			default: "",
			displayOptions: { show: { ...SHOW, searchSource: ["builder"] } },
		},
		{
			displayName: "Filter Groups",
			name: "filterGroups",
			type: "fixedCollection",
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: "Add OR Group",
			default: {},
			description:
				"Conditions within a group are combined with AND, separate groups with OR",
			displayOptions: { show: { ...SHOW, searchSource: ["builder"] } },
			options: [
				{
					name: "group",
					displayName: "Group",
					values: [
						{
							displayName: "Conditions",
							name: "conditions",
							type: "fixedCollection",
							typeOptions: { multipleValues: true, sortable: true },
							placeholder: "Add Condition",
							default: {},
							options: [
								{
									name: "condition",
									displayName: "Condition",
									values: conditionFields,
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: "Order By",
			name: "orderByRules",
			type: "fixedCollection",
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: "Add Sort Rule",
			default: {},
			description:
				"Leave empty to use the API default, which returns the newest contacts first",
			displayOptions: { show: SHOW },
			options: [
				{
					name: "rule",
					displayName: "Rule",
					values: [
						{
							displayName: "Property Name or ID",
							name: "sortProperty",
							type: "options",
							typeOptions: {
								loadOptionsMethod: "getSearchPropertyIdentifiers",
							},
							default: "",
							description:
								'Property to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						},
						{
							displayName: "Sort Order",
							name: "sortOrder",
							type: "options",
							options: [
								{ name: "Ascending", value: "asc" },
								{ name: "Descending", value: "desc" },
							],
							default: "desc",
						},
						{
							displayName: "Nulls",
							name: "nulls",
							type: "options",
							options: [
								{ name: "API Default", value: "" },
								{ name: "First", value: "first" },
								{ name: "Last", value: "last" },
							],
							default: "",
							description: "Where to place records with an empty value",
						},
					],
				},
			],
		},
		{
			displayName: "Return All",
			name: "returnAll",
			type: "boolean",
			default: false,
			description: "Whether to return all results or only up to a given limit",
			displayOptions: { show: SHOW },
		},
		{
			displayName: "Page",
			name: "page",
			type: "number",
			typeOptions: { minValue: 0 },
			default: 0,
			description: "Zero-based page number",
			displayOptions: { show: { ...SHOW, returnAll: [false] } },
		},
		{
			displayName: "Page Size",
			name: "pageSize",
			type: "number",
			typeOptions: { minValue: 1, maxValue: 100 },
			default: 25,
			description: "Max number of results to return",
			displayOptions: { show: { ...SHOW, returnAll: [false] } },
		},
		{
			displayName: "Options",
			name: "searchOptions",
			type: "collection",
			placeholder: "Add Option",
			default: {},
			displayOptions: { show: SHOW },
			options: [
				{
					displayName: "Max Pages",
					name: "maxPages",
					type: "number",
					typeOptions: { minValue: 1 },
					default: 200,
					description:
						"Safety cap on auto-pagination while Return All is enabled",
				},
				{
					displayName: "Split Into Items",
					name: "splitIntoItems",
					type: "boolean",
					default: false,
					description: `Whether to emit one item per record instead of a single item containing a ${entityPlural} array`,
				},
			],
		},
	];
}
