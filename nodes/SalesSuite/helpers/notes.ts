import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "./apiclient";

type NoteResponse = {
	id?: string;
};

export async function createNote(
	ctx: IExecuteFunctions,
	parentId: string,
	plainText: string,
	parentType: "contact" | "deal" = "contact",
): Promise<string | undefined> {
	if (!parentId?.trim())
		throw new ApplicationError("createNote: parentId is required");

	const noteText = (plainText ?? "").trim();
	if (!noteText)
		throw new ApplicationError("createNote: note text is required");

	const qs =
		parentType === "deal" ? { dealId: parentId } : { contactId: parentId };

	const result = await ssRequest<NoteResponse>(ctx, "POST", "/v1/note", {
		qs,
		body: noteText,
		json: false,
		headers: { "Content-Type": "text/plain" },
	});

	return result?.id || undefined;
}
