export const ACTIVITY_CODES = [
  { code: "FLD", label: "Fieldwork" },
  { code: "REV", label: "Review" },
  { code: "PLN", label: "Planning" },
  { code: "RPT", label: "Reporting" },
  { code: "MTG", label: "Client meeting" },
  { code: "TRV", label: "Travel" },
  { code: "TRN", label: "Training" },
  { code: "ADM", label: "Admin" },
] as const;

export type ActivityCode = (typeof ACTIVITY_CODES)[number]["code"];

export const ACTIVITY_CODE_SET = new Set<string>(ACTIVITY_CODES.map((a) => a.code));

export function activityLabel(code: string | null | undefined): string {
  if (!code) return "";
  return ACTIVITY_CODES.find((a) => a.code === code)?.label ?? code;
}
