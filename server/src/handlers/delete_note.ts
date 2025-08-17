import { db } from '../db';
import { notesTable, noteTagsTable } from '../db/schema';
import { type DeleteNoteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteNote(input: DeleteNoteInput): Promise<{ success: boolean }> {
  try {
    // First, verify the note exists and belongs to the user
    const existingNote = await db.select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.id, input.id),
          eq(notesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingNote.length === 0) {
      throw new Error('Note not found or access denied');
    }

    // Delete note-tag relationships first (due to foreign key constraints)
    await db.delete(noteTagsTable)
      .where(eq(noteTagsTable.note_id, input.id))
      .execute();

    // Delete the note itself
    await db.delete(notesTable)
      .where(
        and(
          eq(notesTable.id, input.id),
          eq(notesTable.user_id, input.user_id)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Note deletion failed:', error);
    throw error;
  }
}