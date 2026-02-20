import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "./apiclient";

export async function createNote(
	ctx: IExecuteFunctions,
	parentId: string,
	plainText: string,
	parentType: "contact" | "deal" = "contact",
) {
	if (!parentId?.trim())
		throw new ApplicationError("createNote: parentId is required");

	const noteText = (plainText ?? "").trim();
	if (!noteText)
		throw new ApplicationError("createNote: note text is required");

	const qs =
		parentType === "deal" ? { dealId: parentId } : { contactId: parentId };

	const result = await ssRequest(ctx, "POST", "/note", {
		qs,
		body: noteText,
		json: false,
		headers: { "Content-Type": "text/plain" },
	});

	return result?.id ?? null;
}
