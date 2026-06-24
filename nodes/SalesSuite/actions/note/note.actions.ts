import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import { createNote, NoteContentType } from "../../helpers/notes";

function resolveTarget(
	ctx: IExecuteFunctions,
	i: number,
): { noteTarget: "contact" | "deal"; contactId?: string; dealId?: string } {
	const noteTarget = ctx.getNodeParameter("noteTarget", i, "contact") as
		| "contact"
		| "deal";

	if (noteTarget === "deal") {
		const dealId = (ctx.getNodeParameter("dealId", i) as string)?.trim();
		if (!dealId) throw new ApplicationError("dealId is required.");
		return { noteTarget, dealId };
	}

	const contactId = (ctx.getNodeParameter("contactId", i) as string)?.trim();
	if (!contactId) throw new ApplicationError("contactId is required.");
	return { noteTarget, contactId };
}

export async function handleNote(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createNote": {
			const { noteTarget, contactId, dealId } = resolveTarget(this, i);
			const parentId = noteTarget === "deal" ? dealId! : contactId!;
			const noteText = this.getNodeParameter("noteText", i, "") as string;
			const noteFormat = this.getNodeParameter(
				"noteFormat",
				i,
				"text/plain",
			) as NoteContentType;

			const noteId = await createNote(
				this,
				parentId,
				noteText,
				noteTarget,
				noteFormat,
			);
			return { noteTarget, parentId, noteId: noteId ?? null };
		}

		case "getNoteById": {
			const noteId = (this.getNodeParameter("noteId", i) as string)?.trim();
			if (!noteId) throw new ApplicationError("noteId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/note/${encodeURIComponent(noteId)}`,
			);
			return { noteId, ...(data ?? {}) };
		}

		case "deleteNote": {
			const noteId = (this.getNodeParameter("noteId", i) as string)?.trim();
			if (!noteId) throw new ApplicationError("noteId is required.");

			const data = await ssRequest<IDataObject>(
				this,
				"DELETE",
				`/v1/note/${encodeURIComponent(noteId)}`,
			);
			return { noteId, deleted: true, ...(data ?? {}) };
		}

		case "listNotes":
		case "listNoteFeed": {
			const { noteTarget, contactId, dealId } = resolveTarget(this, i);
			const limit = this.getNodeParameter("limit", i, 50) as number;
			const cursor = (this.getNodeParameter("cursor", i, "") as string).trim();

			const qs: IDataObject = {
				limit,
				...(noteTarget === "deal" ? { dealId } : { contactId }),
			};
			if (cursor) qs.cursor = cursor;

			const endpoint =
				operation === "listNoteFeed" ? "/v1/note/feed" : "/v1/note";
			const data = await ssRequest(this, "GET", endpoint, { qs });
			return {
				noteTarget,
				parentId: noteTarget === "deal" ? dealId : contactId,
				...(data ?? {}),
			};
		}

		default:
			throw new ApplicationError(`Unsupported note operation: ${operation}`);
	}
}
