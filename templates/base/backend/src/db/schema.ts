import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const starterMessages = pgTable("starter_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
