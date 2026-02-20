import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import { createNote } from "../../helpers/notes";

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

		case "listCallTypes": {
			const data = await ssRequest(this, "GET", "/call-types");
			return data ?? [];
		}

		case "listEmailActivities": {
			const contactId = this.getNodeParameter("contactId", i) as string;
			const data = await ssRequest(this, "POST", "/get-mail-activities", {
				body: { contactId },
			});
			return { scope: "contact", parentId: contactId, activities: data ?? [] };
		}

		case "listPhoneCallActivities": {
			const callScope = this.getNodeParameter(
				"callScope",
				i,
				"contact",
			) as "contact" | "deal";
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

			const body: Record<string, unknown> =
				callScope === "deal" ? { dealId: parentId } : { contactId: parentId };
			if (callTypeId && callTypeId !== "any") body.callTypeId = callTypeId;
			if (callResult && callResult !== "any") {
				try {
					body.callResult = JSON.parse(callResult);
				} catch {
					body.callResult = callResult;
				}
			}

			const data = await ssRequest(this, "POST", "/get-call-activities", {
				body: body as any,
			});
			return { scope: callScope, parentId, activities: data ?? [] };
		}

		default:
			throw new ApplicationError(
				`Unsupported activity operation: ${operation}`,
			);
	}
}
