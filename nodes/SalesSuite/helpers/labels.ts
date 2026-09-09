export function compareLabels(
	language: string,
): (a: string, b: string) => number {
	return (a, b) =>
		String(a).localeCompare(String(b), language, { sensitivity: "base" });
}

export function joinFieldAndGroupLabel(field: string, group?: string): string {
	const fieldLabel = String(field ?? "").trim();
	const groupLabel = String(group ?? "").trim();
	if (!groupLabel) return fieldLabel;
	return `${fieldLabel} - ${groupLabel}`;
}
