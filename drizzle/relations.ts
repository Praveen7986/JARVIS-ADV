import { relations } from "drizzle-orm";
import { tracePeople, traceSharingLinks } from "./schema";

export const tracePeopleRelations = relations(tracePeople, ({ many }) => ({
	sharingLinks: many(traceSharingLinks),
}));

export const traceSharingLinksRelations = relations(traceSharingLinks, ({ one }) => ({
	person: one(tracePeople, {
		fields: [traceSharingLinks.personId],
		references: [tracePeople.id],
	}),
}));
