import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import { toApiDateTime } from "../../helpers/datetime";

function resolveTarget(
	ctx: IExecuteFunctions,
	i: number,
): { emailTarget: "contact" | "deal"; contactId?: string; dealId?: string } {
	const emailTarget = ctx.getNodeParameter("emailTarget", i, "contact") as
		| "contact"
		| "deal";

	if (emailTarget === "deal") {
		const dealId = (ctx.getNodeParameter("dealId", i) as string)?.trim();
		if (!dealId) throw new ApplicationError("dealId is required.");
		return { emailTarget, dealId };
	}

	const contactId = (ctx.getNodeParameter("contactId", i) as string)?.trim();
	if (!contactId) throw new ApplicationError("contactId is required.");
	return { emailTarget, contactId };
}

function parseAddresses(raw: unknown): string[] {
	if (raw === undefined || raw === null) return [];
	if (Array.isArray(raw)) {
		return raw.map((x) => String(x).trim()).filter(Boolean);
	}
	if (typeof raw !== "string") {
		const value = String(raw).trim();
		return value ? [value] : [];
	}

	const trimmed = raw.trim();
	if (!trimmed) return [];
	if (trimmed.startsWith("[")) {
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map((x) => String(x).trim()).filter(Boolean);
			}
		} catch {
			// fall through to delimiter parsing
		}
	}

	return trimmed
		.split(/[\n,;]/)
		.map((x) => x.trim())
		.filter(Boolean);
}

export async function handleEmailActivity(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createLoggedEmailActivity": {
			const { emailTarget, contactId, dealId } = resolveTarget(this, i);
			const from = (this.getNodeParameter("from", i) as string).trim();
			const to = parseAddresses(this.getNodeParameter("to", i));
			const cc = parseAddresses(this.getNodeParameter("cc", i, ""));
			const bcc = parseAddresses(this.getNodeParameter("bcc", i, ""));
			const subject = (
				this.getNodeParameter("subject", i, "") as string
			).trim();
			const content = (this.getNodeParameter("content", i) as string).trim();
			const emailSentAt = toApiDateTime(
				this.getNodeParameter("emailSentAt", i, ""),
			);

			if (!from) throw new ApplicationError("from is required.");
			if (!to.length) throw new ApplicationError("to is required.");
			if (!content) throw new ApplicationError("content is required.");

			const body: IDataObject = {
				from,
				to,
				content,
			};
			if (dealId) body.dealId = dealId;
			if (contactId) body.contactId = contactId;
			if (cc.length) body.cc = cc;
			if (bcc.length) body.bcc = bcc;
			if (subject) body.subject = subject;
			if (emailSentAt) body.emailSentAt = emailSentAt;

			const data = await ssRequest(this, "POST", "/v1/email-activity/logged", {
				body,
			});
			return { ...(data ?? {}), inputData: body, emailTarget };
		}

		case "getEmailActivityById": {
			const emailActivityId = (
				this.getNodeParameter("emailActivityId", i) as string
			).trim();
			if (!emailActivityId)
				throw new ApplicationError("emailActivityId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/email-activity/${encodeURIComponent(emailActivityId)}`,
			);
			return { emailActivityId, ...(data ?? {}) };
		}

		case "deleteEmailActivity": {
			const emailActivityId = (
				this.getNodeParameter("emailActivityId", i) as string
			).trim();
			if (!emailActivityId)
				throw new ApplicationError("emailActivityId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"DELETE",
				`/v1/email-activity/${encodeURIComponent(emailActivityId)}`,
			);
			return { emailActivityId, deleted: true, ...(data ?? {}) };
		}

		case "listEmailActivities":
		case "listEmailActivityFeed": {
			const { emailTarget, contactId, dealId } = resolveTarget(this, i);
			const limit = this.getNodeParameter("limit", i, 50) as number;
			const cursor = (this.getNodeParameter("cursor", i, "") as string).trim();

			const qs: IDataObject = {
				limit,
				...(emailTarget === "deal" ? { dealId } : { contactId }),
			};
			if (cursor) qs.cursor = cursor;

			const endpoint =
				operation === "listEmailActivityFeed"
					? "/v1/email-activity/feed"
					: "/v1/email-activity";
			const data = await ssRequest(this, "GET", endpoint, { qs });
			return {
				emailTarget,
				parentId: emailTarget === "deal" ? dealId : contactId,
				...(data ?? {}),
			};
		}

		default:
			throw new ApplicationError(
				`Unsupported email activity operation: ${operation}`,
			);
	}
}
