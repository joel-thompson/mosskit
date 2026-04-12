export function envIsUndefined(value: string | undefined | null) {
  return value === undefined || value === null || value === "";
}
