import { pgTable, serial, timestamp, index, unique, pgPolicy, uuid, varchar, foreignKey, check, text } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("users_email_unique").on(table.email),
	pgPolicy("users_insert_policy", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("users_select_policy", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("users_update_policy", { as: "permissive", for: "update", to: ["public"] }),
]);

export const subtasks = pgTable("subtasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	problem: text(),
	solution: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('todo'),
	priority: varchar({ length: 20 }).default('medium'),
}, (table) => [
	index("subtasks_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("subtasks_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("subtasks_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "subtasks_project_id_projects_id_fk"
		}).onDelete("cascade"),
	pgPolicy("subtasks_all_policy", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	check("subtasks_status_check", sql`(status)::text = ANY ((ARRAY['todo'::character varying, 'done'::character varying, 'paused'::character varying])::text[])`),
	check("subtasks_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])`),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	priority: varchar({ length: 20 }).default('medium'),
}, (table) => [
	index("projects_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("projects_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("projects_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}).onDelete("cascade"),
	pgPolicy("projects_all_policy", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	check("projects_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[])`),
]);

export const outputs = pgTable("outputs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("outputs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("outputs_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "outputs_project_id_projects_id_fk"
		}).onDelete("cascade"),
	pgPolicy("outputs_all_policy", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);
