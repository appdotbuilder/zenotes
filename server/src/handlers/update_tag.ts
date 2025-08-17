import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type UpdateTagInput, type Tag } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTag = async (input: UpdateTagInput): Promise<Tag> => {
  try {
    // First, verify the tag exists and get the current tag data
    const existingTags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, input.id))
      .execute();

    if (existingTags.length === 0) {
      throw new Error('Tag not found');
    }

    const existingTag = existingTags[0];

    // If name is being updated, check for uniqueness within user's tags
    if (input.name && input.name !== existingTag.name) {
      const duplicateTags = await db.select()
        .from(tagsTable)
        .where(
          and(
            eq(tagsTable.user_id, existingTag.user_id),
            eq(tagsTable.name, input.name)
          )
        )
        .execute();

      if (duplicateTags.length > 0) {
        throw new Error('Tag with this name already exists');
      }
    }

    // Build update values - only include fields that are being updated
    const updateValues: Partial<typeof tagsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }

    if (input.color !== undefined) {
      updateValues.color = input.color;
    }

    // Update the tag
    const result = await db.update(tagsTable)
      .set(updateValues)
      .where(eq(tagsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tag update failed:', error);
    throw error;
  }
};