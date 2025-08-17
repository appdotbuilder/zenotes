import { text, pgTable, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Folders table
export const foldersTable = pgTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  parent_folder_id: text('parent_folder_id'), // Self-reference constraint handled via relations
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tags table
export const tagsTable = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'), // Nullable for default colors
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Notes table
export const notesTable = pgTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  markdown_content: text('markdown_content'), // Nullable for rich text only notes
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  folder_id: text('folder_id').references(() => foldersTable.id, { onDelete: 'set null' }),
  is_favorite: boolean('is_favorite').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Note-Tag junction table for many-to-many relationship
export const noteTagsTable = pgTable('note_tags', {
  note_id: text('note_id').notNull().references(() => notesTable.id, { onDelete: 'cascade' }),
  tag_id: text('tag_id').notNull().references(() => tagsTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.note_id, table.tag_id] })
  };
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  folders: many(foldersTable),
  tags: many(tagsTable),
  notes: many(notesTable)
}));

export const foldersRelations = relations(foldersTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [foldersTable.user_id],
    references: [usersTable.id]
  }),
  parentFolder: one(foldersTable, {
    fields: [foldersTable.parent_folder_id],
    references: [foldersTable.id],
    relationName: 'parent'
  }),
  subFolders: many(foldersTable, {
    relationName: 'parent'
  }),
  notes: many(notesTable)
}));

export const tagsRelations = relations(tagsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [tagsTable.user_id],
    references: [usersTable.id]
  }),
  noteTags: many(noteTagsTable)
}));

export const notesRelations = relations(notesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [notesTable.user_id],
    references: [usersTable.id]
  }),
  folder: one(foldersTable, {
    fields: [notesTable.folder_id],
    references: [foldersTable.id]
  }),
  noteTags: many(noteTagsTable)
}));

export const noteTagsRelations = relations(noteTagsTable, ({ one }) => ({
  note: one(notesTable, {
    fields: [noteTagsTable.note_id],
    references: [notesTable.id]
  }),
  tag: one(tagsTable, {
    fields: [noteTagsTable.tag_id],
    references: [tagsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Folder = typeof foldersTable.$inferSelect;
export type NewFolder = typeof foldersTable.$inferInsert;

export type Tag = typeof tagsTable.$inferSelect;
export type NewTag = typeof tagsTable.$inferInsert;

export type Note = typeof notesTable.$inferSelect;
export type NewNote = typeof notesTable.$inferInsert;

export type NoteTag = typeof noteTagsTable.$inferSelect;
export type NewNoteTag = typeof noteTagsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  folders: foldersTable,
  tags: tagsTable,
  notes: notesTable,
  noteTags: noteTagsTable
};