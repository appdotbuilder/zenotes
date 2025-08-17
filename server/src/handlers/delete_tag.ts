import { db } from '../db';
import { tagsTable, noteTagsTable } from '../db/schema';
import { type DeleteTagInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTag(input: DeleteTagInput): Promise<{ success: boolean }> {
  try {
    // Verify the tag exists and belongs to the user
    const existingTags = await db.select()
      .from(tagsTable)
      .where(and(
        eq(tagsTable.id, input.id),
        eq(tagsTable.user_id, input.user_id)
      ))
      .execute();

    if (existingTags.length === 0) {
      throw new Error('Tag not found or you do not have permission to delete it');
    }

    // Delete all note-tag associations first (due to foreign key constraints)
    await db.delete(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, input.id))
      .execute();

    // Delete the tag itself
    await db.delete(tagsTable)
      .where(and(
        eq(tagsTable.id, input.id),
        eq(tagsTable.user_id, input.user_id)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Tag deletion failed:', error);
    throw error;
  }
}