import type { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type ContactPayload = {
	contact?: {
		id?: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	mainContactPerson?: {
		id?: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	};
};

function formatContactLabel(entry: ContactPayload): {
	label: string;
	email?: string;
} {
	const contact = entry?.contact ?? {};
	const person = entry?.mainContactPerson ?? {};
	const first = person.firstName || contact.firstName || "";
	const last = person.lastName || contact.lastName || "";
	const email = person.email || contact.email || "";
	const full = `${first} ${last}`.trim();
	return {
		label: full || email || contact.id || "Unknown",
		email: email || undefined,
	};
}

export async function getContacts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let search = "";
	try {
		search = (this.getNodeParameter("contactSearch", 0) as string) || "";
	} catch {
		search = "";
	}

	let data: ContactPayload[] = [];

	if (search.trim()) {
		data = (await ssRequest(this, "GET", "/v1/contact/search", {
			qs: { query: search.trim() },
		})) as ContactPayload[];
	} else {
		data = (await ssRequest(this, "GET", "/v1/contact", {
			qs: { page: 0, pageSize: 25 },
		})) as ContactPayload[];
	}

	if (!Array.isArray(data) || !data.length) {
		return [{ name: "No Contacts Found", value: "" }];
	}

	return data.map((entry) => {
		const { label, email } = formatContactLabel(entry);
		return {
			name: label,
			value: String(entry?.contact?.id ?? ""),
			description: email,
		};
	});
}
