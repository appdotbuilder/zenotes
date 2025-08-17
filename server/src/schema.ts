import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Folder schema
export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  user_id: z.string(),
  parent_folder_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Folder = z.infer<typeof folderSchema>;

// Tag schema
export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  user_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Tag = z.infer<typeof tagSchema>;

// Note schema
export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  markdown_content: z.string().nullable(),
  user_id: z.string(),
  folder_id: z.string().nullable(),
  is_favorite: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Note = z.infer<typeof noteSchema>;

// Note-Tag relationship schema
export const noteTagSchema = z.object({
  note_id: z.string(),
  tag_id: z.string(),
  created_at: z.coerce.date()
});

export type NoteTag = z.infer<typeof noteTagSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Folder input schemas
export const createFolderInputSchema = z.object({
  name: z.string().min(1).max(100),
  user_id: z.string(),
  parent_folder_id: z.string().nullable().optional()
});

export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

export const updateFolderInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  parent_folder_id: z.string().nullable().optional()
});

export type UpdateFolderInput = z.infer<typeof updateFolderInputSchema>;

// Tag input schemas
export const createTagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().nullable().optional(),
  user_id: z.string()
});

export type CreateTagInput = z.infer<typeof createTagInputSchema>;

export const updateTagInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().nullable().optional()
});

export type UpdateTagInput = z.infer<typeof updateTagInputSchema>;

// Note input schemas
export const createNoteInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  markdown_content: z.string().nullable().optional(),
  user_id: z.string(),
  folder_id: z.string().nullable().optional(),
  tag_ids: z.array(z.string()).optional()
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

export const updateNoteInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  markdown_content: z.string().nullable().optional(),
  folder_id: z.string().nullable().optional(),
  is_favorite: z.boolean().optional(),
  tag_ids: z.array(z.string()).optional()
});

export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

// Query input schemas
export const getUserNotesInputSchema = z.object({
  user_id: z.string(),
  folder_id: z.string().nullable().optional(),
  tag_id: z.string().optional(),
  search: z.string().optional(),
  is_favorite: z.boolean().optional()
});

export type GetUserNotesInput = z.infer<typeof getUserNotesInputSchema>;

export const getUserFoldersInputSchema = z.object({
  user_id: z.string(),
  parent_folder_id: z.string().nullable().optional()
});

export type GetUserFoldersInput = z.infer<typeof getUserFoldersInputSchema>;

export const getUserTagsInputSchema = z.object({
  user_id: z.string()
});

export type GetUserTagsInput = z.infer<typeof getUserTagsInputSchema>;

export const deleteNoteInputSchema = z.object({
  id: z.string(),
  user_id: z.string()
});

export type DeleteNoteInput = z.infer<typeof deleteNoteInputSchema>;

export const deleteFolderInputSchema = z.object({
  id: z.string(),
  user_id: z.string()
});

export type DeleteFolderInput = z.infer<typeof deleteFolderInputSchema>;

export const deleteTagInputSchema = z.object({
  id: z.string(),
  user_id: z.string()
});

export type DeleteTagInput = z.infer<typeof deleteTagInputSchema>;