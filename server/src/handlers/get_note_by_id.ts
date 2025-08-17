import { db } from '../db';
import { notesTable } from '../db/schema';
import { type Note } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getNoteById(noteId: string, userId: string): Promise<Note | null> {
  try {
    // Query note with user ownership validation
    const results = await db.select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.id, noteId),
          eq(notesTable.user_id, userId)
        )
      )
      .execute();

    // Return null if note not found or doesn't belong to user
    if (results.length === 0) {
      return null;
    }

    const note = results[0];
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      markdown_content: note.markdown_content,
      user_id: note.user_id,
      folder_id: note.folder_id,
      is_favorite: note.is_favorite,
      created_at: note.created_at,
      updated_at: note.updated_at
    };
  } catch (error) {
    console.error('Failed to fetch note:', error);
    throw error;
  }
}