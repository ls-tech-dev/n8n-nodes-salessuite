import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import { toApiDateTime } from "../../helpers/datetime";

function resolveTarget(
	ctx: IExecuteFunctions,
	i: number,
): { callTarget: "contact" | "deal"; contactId?: string; dealId?: string } {
	const callTarget = ctx.getNodeParameter("callTarget", i, "contact") as
		| "contact"
		| "deal";

	if (callTarget === "deal") {
		const dealId = (ctx.getNodeParameter("dealId", i) as string)?.trim();
		if (!dealId) throw new ApplicationError("dealId is required.");
		return { callTarget, dealId };
	}

	const contactId = (ctx.getNodeParameter("contactId", i) as string)?.trim();
	if (!contactId) throw new ApplicationError("contactId is required.");
	return { callTarget, contactId };
}

function parseCallResult(raw: unknown): unknown {
	if (typeof raw !== "string") return raw;
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		return raw;
	}
}

export async function handleCallActivity(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createCallActivity": {
			const { callTarget, contactId, dealId } = resolveTarget(this, i);
			const callTypeId = (
				this.getNodeParameter("callTypeId", i) as string
			).trim();
			const callerUserId = (
				this.getNodeParameter("callerUserId", i) as string
			).trim();
			const durationSec = this.getNodeParameter("durationSec", i) as number;
			const callerPhoneNumber = (
				this.getNodeParameter("callerPhoneNumber", i) as string
			).trim();
			const calleePhoneNumber = (
				this.getNodeParameter("calleePhoneNumber", i) as string
			).trim();
			const callResultRaw = this.getNodeParameter("callResult", i) as string;
			const callStartedAt = toApiDateTime(
				this.getNodeParameter("callStartedAt", i, ""),
			);
			const calleeContactPersonId = (
				this.getNodeParameter("calleeContactPersonId", i, "") as string
			).trim();
			const notes = (this.getNodeParameter("notes", i, "") as string).trim();
			const userCallDeviceId = (
				this.getNodeParameter("userCallDeviceId", i, "") as string
			).trim();

			if (!callTypeId) throw new ApplicationError("callTypeId is required.");
			if (!callerUserId)
				throw new ApplicationError("callerUserId is required.");
			if (!callerPhoneNumber)
				throw new ApplicationError("callerPhoneNumber is required.");
			if (!calleePhoneNumber)
				throw new ApplicationError("calleePhoneNumber is required.");

			const body: IDataObject = {
				callTypeId,
				callerUserId,
				durationSec,
				callResult: parseCallResult(callResultRaw) as IDataObject,
				callerPhoneNumber,
				calleePhoneNumber,
			};

			if (callTarget === "deal") body.dealId = dealId;
			else body.contactId = contactId;
			if (callStartedAt) body.callStartedAt = callStartedAt;
			if (calleeContactPersonId)
				body.calleeContactPersonId = calleeContactPersonId;
			if (notes) body.notes = notes;
			if (userCallDeviceId) body.userCallDeviceId = userCallDeviceId;

			const data = await ssRequest(this, "POST", "/v1/call-activity", {
				body,
			});
			return { ...(data ?? {}), inputData: body };
		}

		case "getCallActivityById": {
			const callActivityId = (
				this.getNodeParameter("callActivityId", i) as string
			).trim();
			if (!callActivityId)
				throw new ApplicationError("callActivityId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/call-activity/${encodeURIComponent(callActivityId)}`,
			);
			return { callActivityId, ...(data ?? {}) };
		}

		case "deleteCallActivity": {
			const callActivityId = (
				this.getNodeParameter("callActivityId", i) as string
			).trim();
			if (!callActivityId)
				throw new ApplicationError("callActivityId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"DELETE",
				`/v1/call-activity/${encodeURIComponent(callActivityId)}`,
			);
			return { callActivityId, deleted: true, ...(data ?? {}) };
		}

		case "listCallActivities":
		case "listCallActivityFeed": {
			const { callTarget, contactId, dealId } = resolveTarget(this, i);
			const limit = this.getNodeParameter("limit", i, 50) as number;
			const cursor = (this.getNodeParameter("cursor", i, "") as string).trim();

			const qs: IDataObject = {
				limit,
				...(callTarget === "deal" ? { dealId } : { contactId }),
			};
			if (cursor) qs.cursor = cursor;

			const endpoint =
				operation === "listCallActivityFeed"
					? "/v1/call-activity/feed"
					: "/v1/call-activity";
			const data = await ssRequest(this, "GET", endpoint, { qs });
			return {
				callTarget,
				parentId: callTarget === "deal" ? dealId : contactId,
				...(data ?? {}),
			};
		}

		case "listCallTypes": {
			const data = await ssRequest(this, "GET", "/v1/call-types");
			return data ?? [];
		}

		case "getCallTypeById": {
			const callTypeId = (
				this.getNodeParameter("callTypeId", i) as string
			)?.trim();
			if (!callTypeId) throw new ApplicationError("callTypeId is required.");

			const data = await ssRequest(this, "GET", "/v1/call-types");
			const list = Array.isArray(data) ? data : [];

			if (callTypeId === "any") return list;

			const match = list.find((ct: { id: string }) => ct.id === callTypeId);
			if (!match) {
				throw new ApplicationError(`No call type found for ID: ${callTypeId}`);
			}
			return match;
		}

		default:
			throw new ApplicationError(
				`Unsupported call activity operation: ${operation}`,
			);
	}
}
