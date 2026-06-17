import { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type UserPayload = {
	id?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	tenantAccess?: { role?: string };
};

async function fetchUsers(ctx: ILoadOptionsFunctions): Promise<UserPayload[]> {
	const data = (await ssRequest(ctx, "GET", "/v1/user", {
		qs: { page: 0, pageSize: 100 },
	})) as UserPayload[];
	return Array.isArray(data) ? data : [];
}

function userLabel(user: UserPayload): string {
	const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
	const label = full || user.email || user.id || "Unknown";
	const role = user.tenantAccess?.role;
	return role ? `${label} (${role})` : label;
}

// Returns users keyed by their ID (for the "Get User by ID" operation).
export async function getUsers(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const users = await fetchUsers(this);
	if (!users.length) return [{ name: "No Users Found", value: "" }];

	return users.map((user) => ({
		name: userLabel(user),
		value: String(user.id ?? ""),
		description: user.email || undefined,
	}));
}

// Returns users keyed by their email (for the "Find User by Email" operation).
export async function getUsersByEmail(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const users = await fetchUsers(this);
	const withEmail = users.filter((user) => !!user.email);
	if (!withEmail.length) return [{ name: "No Users Found", value: "" }];

	return withEmail.map((user) => ({
		name: userLabel(user),
		value: String(user.email),
		description: user.email || undefined,
	}));
}
