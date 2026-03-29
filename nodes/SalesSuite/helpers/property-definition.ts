export type DynamicDbTableName = "Contact" | "ContactPerson" | "Deal";

export type TypeDefinitionSelect = {
	type: "select";
	variant?: "multi" | string;
	options?: Array<{ label: string; key: string; [key: string]: unknown }>;
	[key: string]: unknown;
};

export type TypeDefinition =
	| { type: "string"; [key: string]: unknown }
	| { type: "number"; [key: string]: unknown }
	| { type: "boolean"; [key: string]: unknown }
	| { type: "dateTime"; [key: string]: unknown }
	| TypeDefinitionSelect
	| { type: string; [key: string]: unknown };

export type FixValueForTypeDefinitionConfig = {
	boolean?: unknown;
	number?: unknown;
	string?: unknown;
	dateTime?: unknown;
	select?: unknown;
	[key: string]: unknown;
};

export function createDataFixerForTypeDefinition(
	typeDef: TypeDefinition,
	config: FixValueForTypeDefinitionConfig,
): (value: unknown) => { value: unknown } {
	void typeDef;
	void config;
	return (value: unknown) => ({ value });
}
