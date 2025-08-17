import { db } from '../db';
import { tagsTable, usersTable } from '../db/schema';
import { type CreateTagInput, type Tag } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  try {
    // Verify user exists first to prevent foreign key constraint errors
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Check if tag name already exists for this user
    const existingTag = await db.select()
      .from(tagsTable)
      .where(
        and(
          eq(tagsTable.user_id, input.user_id),
          eq(tagsTable.name, input.name)
        )
      )
      .limit(1)
      .execute();

    if (existingTag.length > 0) {
      throw new Error(`Tag with name "${input.name}" already exists for this user`);
    }

    // Generate unique ID for the tag
    const tagId = crypto.randomUUID();

    // Insert tag record
    const result = await db.insert(tagsTable)
      .values({
        id: tagId,
        name: input.name,
        color: input.color || null,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Tag creation failed:', error);
    throw error;
  }
};