import { db } from '../db';
import { notesTable, foldersTable, tagsTable, noteTagsTable } from '../db/schema';
import { type CreateNoteInput, type Note } from '../schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const createNote = async (input: CreateNoteInput): Promise<Note> => {
  try {
    // Validate folder ownership if folder_id is provided
    if (input.folder_id) {
      const folder = await db.select()
        .from(foldersTable)
        .where(and(
          eq(foldersTable.id, input.folder_id),
          eq(foldersTable.user_id, input.user_id)
        ))
        .execute();

      if (folder.length === 0) {
        throw new Error('Folder not found or access denied');
      }
    }

    // Validate tag ownership if tag_ids are provided
    if (input.tag_ids && input.tag_ids.length > 0) {
      const tags = await db.select()
        .from(tagsTable)
        .where(and(
          eq(tagsTable.user_id, input.user_id)
        ))
        .execute();

      const userTagIds = tags.map(tag => tag.id);
      const invalidTags = input.tag_ids.filter(tagId => !userTagIds.includes(tagId));
      
      if (invalidTags.length > 0) {
        throw new Error('One or more tags not found or access denied');
      }
    }

    const noteId = randomUUID();
    const now = new Date();

    // Insert note record
    const result = await db.insert(notesTable)
      .values({
        id: noteId,
        title: input.title,
        content: input.content,
        markdown_content: input.markdown_content || null,
        user_id: input.user_id,
        folder_id: input.folder_id || null,
        is_favorite: false,
        created_at: now,
        updated_at: now
      })
      .returning()
      .execute();

    // Create note-tag relationships if tag_ids are provided
    if (input.tag_ids && input.tag_ids.length > 0) {
      const noteTagValues = input.tag_ids.map(tagId => ({
        note_id: noteId,
        tag_id: tagId,
        created_at: now
      }));

      await db.insert(noteTagsTable)
        .values(noteTagValues)
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Note creation failed:', error);
    throw error;
  }
};