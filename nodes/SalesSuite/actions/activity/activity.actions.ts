import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import { createNote } from "../../helpers/notes";

/**
 * Backward-compatibility shim for the legacy "Activity" resource. The resource is
 * no longer offered in the resource selector (its operations moved to the dedicated
 * Note / Call Activity / Email Activity resources), but existing saved workflows may
 * still reference `resource: "activity"`, so these operations must keep working with
 * their original behaviour and output shape.
 */
export async function handleActivity(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createNote": {
			const noteTarget = this.getNodeParameter("noteTarget", i, "contact") as
				| "contact"
				| "deal";
			const parentId = this.getNodeParameter(
				noteTarget === "deal" ? "dealId" : "contactId",
				i,
			) as string;
			const noteText = this.getNodeParameter("noteText", i, "") as string;

			const noteId = await createNote(this, parentId, noteText, noteTarget);
			return {
				parentType: noteTarget,
				parentId,
				noteId: noteId ?? null,
			};
		}

		case "getCallTypeById": {
			const callTypeId = (
				this.getNodeParameter("callTypeId", i) as string
			)?.trim();

			if (!callTypeId) {
				throw new ApplicationError("callTypeId is required.");
			}

			const data = await ssRequest(this, "GET", "/v1/call-types");
			const list = Array.isArray(data) ? data : [];

			if (callTypeId === "any") {
				return list;
			}

			const match = list.find((ct: { id: string }) => ct.id === callTypeId);

			if (!match) {
				throw new ApplicationError(`No call type found for ID: ${callTypeId}`);
			}

			return match;
		}

		case "listCallTypes": {
			const data = await ssRequest(this, "GET", "/v1/call-types");
			return data ?? [];
		}

		case "listEmailActivities": {
			const contactId = this.getNodeParameter("contactId", i) as string;
			const data = await ssRequest(this, "POST", "/v1/get-mail-activities", {
				body: { contactId },
			});
			return { scope: "contact", parentId: contactId, activities: data ?? [] };
		}

		case "listPhoneCallActivities": {
			const callScope = this.getNodeParameter("callScope", i, "contact") as
				| "contact"
				| "deal";
			const parentId = this.getNodeParameter(
				callScope === "deal" ? "dealId" : "contactId",
				i,
			) as string;
			const callTypeId = (
				this.getNodeParameter("phoneCallActivityTypeId", i, "") as string
			).trim();
			const callResult = (
				this.getNodeParameter("callResult", i, "") as string
			).trim();

			const body: IDataObject =
				callScope === "deal" ? { dealId: parentId } : { contactId: parentId };
			if (callTypeId && callTypeId !== "any") body.callTypeId = callTypeId;
			if (callResult && callResult !== "any") {
				try {
					body.callResult = JSON.parse(callResult);
				} catch {
					body.callResult = callResult;
				}
			}

			const data = await ssRequest(this, "POST", "/v1/get-call-activities", {
				body,
			});
			return { scope: callScope, parentId, activities: data ?? [] };
		}

		default:
			throw new ApplicationError(
				`Unsupported activity operation: ${operation}`,
			);
	}
}
