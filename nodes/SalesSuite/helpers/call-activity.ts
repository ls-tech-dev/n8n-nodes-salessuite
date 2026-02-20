export type OpeningCallResultNew = {
	result: string;
	viaGatekeeper?: boolean;
};

export type CallActivityResultType =
	| { type: "opening"; openingResult: OpeningCallResultNew }
	| { type: "setting"; settingResult?: string }
	| { type: "closing"; closingResult?: string };

type ZodLiteralDef = { value: string };
type OpeningOptionShape = {
	result: ZodLiteralDef;
	viaGatekeeper?: ZodLiteralDef;
	[key: string]: unknown;
};
type OpeningOptionDef = {
	_def: { shape: () => OpeningOptionShape };
};

export const openingCallResultSchema: { options: OpeningOptionDef[] } = {
	options: [
		{ _def: { shape: () => ({ result: { value: "notReached" } }) } },
		{
			_def: {
				shape: () => ({ result: { value: "gatekeeperRefusedConnection" } }),
			},
		},
		{
			_def: {
				shape: () => ({
					result: { value: "notInterested" },
					viaGatekeeper: { value: "" },
				}),
			},
		},
		{
			_def: {
				shape: () => ({
					result: { value: "notScheduled" },
					viaGatekeeper: { value: "" },
				}),
			},
		},
		{
			_def: {
				shape: () => ({
					result: { value: "scheduled" },
					viaGatekeeper: { value: "" },
				}),
			},
		},
	],
};

/** Mirrors settingCallResultSchema from @poc/common/call-activity. */
export const settingCallResultSchema: { options: string[] } = {
	options: [
		"notReached",
		"rescheduled",
		"canceled",
		"followUp",
		"unqualified",
		"qualified",
		"scheduled",
	],
};

/** Mirrors closingCallResultSchema from @poc/common/call-activity. */
export const closingCallResultSchema: { options: string[] } = {
	options: ["notReached", "rescheduled", "canceled", "notSold", "sold"],
};
