import { envIsUndefined } from "./envIsUndefined";

test("envIsUndefined identifies empty values", () => {
  expect(envIsUndefined(undefined)).toBe(true);
  expect(envIsUndefined("")).toBe(true);
  expect(envIsUndefined("value")).toBe(false);
});
