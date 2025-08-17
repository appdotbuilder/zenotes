import { db } from '../db';
import { tagsTable } from '../db/schema';
import { type GetUserTagsInput, type Tag } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getUserTags(input: GetUserTagsInput): Promise<Tag[]> {
  try {
    const results = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.user_id, input.user_id))
      .orderBy(asc(tagsTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Get user tags failed:', error);
    throw error;
  }
}