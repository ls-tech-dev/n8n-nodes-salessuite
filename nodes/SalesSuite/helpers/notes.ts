import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "./apiclient";

type NoteResponse = {
	id?: string;
};

export type NoteContentType = "text/plain" | "text/html";

export async function createNote(
	ctx: IExecuteFunctions,
	parentId: string,
	text: string,
	parentType: "contact" | "deal" = "contact",
	contentType: NoteContentType = "text/plain",
): Promise<string | undefined> {
	if (!parentId?.trim())
		throw new ApplicationError("createNote: parentId is required");

	const noteText = (text ?? "").trim();
	if (!noteText)
		throw new ApplicationError("createNote: note text is required");

	const qs =
		parentType === "deal" ? { dealId: parentId } : { contactId: parentId };

	const result = await ssRequest<NoteResponse>(ctx, "POST", "/v1/note", {
		qs,
		body: noteText,
		json: false,
		headers: { "Content-Type": contentType },
	});

	return result?.id || undefined;
}
