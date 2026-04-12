import { exampleStatusResponseSchema } from "./index";

test("exampleStatusResponseSchema validates the starter payload", () => {
  expect(
    exampleStatusResponseSchema.parse({
      success: true,
      data: {
        message: "Backend reachable",
        database: {
          configured: true,
          connected: false
        }
      }
    })
  ).toMatchObject({
    success: true
  });
});
