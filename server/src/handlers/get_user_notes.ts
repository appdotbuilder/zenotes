import { db } from '../db';
import { notesTable, noteTagsTable } from '../db/schema';
import { type GetUserNotesInput, type Note } from '../schema';
import { eq, and, ilike, or, isNull, SQL } from 'drizzle-orm';

export async function getUserNotes(input: GetUserNotesInput): Promise<Note[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id
    conditions.push(eq(notesTable.user_id, input.user_id));

    // Filter by folder if specified
    if (input.folder_id !== undefined) {
      if (input.folder_id === null) {
        // Notes not in any folder
        conditions.push(isNull(notesTable.folder_id));
      } else {
        // Notes in specific folder
        conditions.push(eq(notesTable.folder_id, input.folder_id));
      }
    }

    // Filter by favorites if specified
    if (input.is_favorite !== undefined) {
      conditions.push(eq(notesTable.is_favorite, input.is_favorite));
    }

    // Filter by search term in title or content
    if (input.search) {
      const searchTerm = `%${input.search}%`;
      conditions.push(
        or(
          ilike(notesTable.title, searchTerm),
          ilike(notesTable.content, searchTerm)
        )!
      );
    }

    // Handle tag filtering with JOIN
    if (input.tag_id) {
      // Add tag condition
      conditions.push(eq(noteTagsTable.tag_id, input.tag_id));

      // Query with JOIN for tag filtering
      const results = await db.select()
        .from(notesTable)
        .innerJoin(noteTagsTable, eq(notesTable.id, noteTagsTable.note_id))
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute();

      // Extract notes from joined results and remove duplicates
      const notes = results.map(result => (result as any).notes);
      const uniqueNotes = notes.filter((note, index, self) => 
        index === self.findIndex(n => n.id === note.id)
      );

      return uniqueNotes;
    } else {
      // Query without JOIN for non-tag filtering
      const results = await db.select()
        .from(notesTable)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute();

      return results;
    }
  } catch (error) {
    console.error('Failed to get user notes:', error);
    throw error;
  }
}