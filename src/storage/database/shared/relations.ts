import { relations } from "drizzle-orm/relations";
import { projects, subtasks, users, outputs } from "./schema";

export const subtasksRelations = relations(subtasks, ({one}) => ({
	project: one(projects, {
		fields: [subtasks.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	subtasks: many(subtasks),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	outputs: many(outputs),
}));

export const usersRelations = relations(users, ({many}) => ({
	projects: many(projects),
}));

export const outputsRelations = relations(outputs, ({one}) => ({
	project: one(projects, {
		fields: [outputs.projectId],
		references: [projects.id]
	}),
}));