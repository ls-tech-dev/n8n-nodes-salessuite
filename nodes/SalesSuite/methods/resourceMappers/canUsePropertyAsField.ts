import type { ApiPropertyDefinition } from "../../helpers/fieldMapping";

export function canUsePropertyAsField(
	property: ApiPropertyDefinition,
): boolean {
	if (property.propertyType === "dynamic") return true;

	const info = property.resolvedPropertyDefinition?.propertyInfo;

	if (!info) return false;

	return info.editableInForm === true || info.editableInBulk === true;
}
