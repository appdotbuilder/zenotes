import { db } from '../db';
import { notesTable, noteTagsTable, foldersTable, tagsTable } from '../db/schema';
import { type UpdateNoteInput, type Note } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateNote = async (input: UpdateNoteInput): Promise<Note> => {
  try {
    // First, verify the note exists and get the user_id for ownership validation
    const existingNote = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, input.id))
      .execute();

    if (existingNote.length === 0) {
      throw new Error('Note not found');
    }

    const note = existingNote[0];
    
    // Validate folder ownership if folder_id is being updated
    if (input.folder_id !== undefined && input.folder_id !== null) {
      const folder = await db.select()
        .from(foldersTable)
        .where(
          and(
            eq(foldersTable.id, input.folder_id),
            eq(foldersTable.user_id, note.user_id)
          )
        )
        .execute();

      if (folder.length === 0) {
        throw new Error('Folder not found or does not belong to user');
      }
    }

    // Validate tag ownership if tag_ids are provided
    if (input.tag_ids && input.tag_ids.length > 0) {
      const tags = await db.select()
        .from(tagsTable)
        .where(
          and(
            eq(tagsTable.user_id, note.user_id)
          )
        )
        .execute();

      const userTagIds = new Set(tags.map(tag => tag.id));
      const invalidTags = input.tag_ids.filter(tagId => !userTagIds.has(tagId));
      
      if (invalidTags.length > 0) {
        throw new Error('One or more tags do not belong to user');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.markdown_content !== undefined) {
      updateData.markdown_content = input.markdown_content;
    }
    if (input.folder_id !== undefined) {
      updateData.folder_id = input.folder_id;
    }
    if (input.is_favorite !== undefined) {
      updateData.is_favorite = input.is_favorite;
    }

    // Update the note
    const updatedNotes = await db.update(notesTable)
      .set(updateData)
      .where(eq(notesTable.id, input.id))
      .returning()
      .execute();

    // Handle tag relationships if tag_ids are provided
    if (input.tag_ids !== undefined) {
      // Remove all existing tag relationships
      await db.delete(noteTagsTable)
        .where(eq(noteTagsTable.note_id, input.id))
        .execute();

      // Add new tag relationships
      if (input.tag_ids.length > 0) {
        const tagRelationships = input.tag_ids.map(tagId => ({
          note_id: input.id,
          tag_id: tagId
        }));

        await db.insert(noteTagsTable)
          .values(tagRelationships)
          .execute();
      }
    }

    return updatedNotes[0];
  } catch (error) {
    console.error('Note update failed:', error);
    throw error;
  }
};