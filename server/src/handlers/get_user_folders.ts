import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type GetUserFoldersInput, type Folder } from '../schema';
import { eq, and, isNull, type SQL } from 'drizzle-orm';

export const getUserFolders = async (input: GetUserFoldersInput): Promise<Folder[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(foldersTable.user_id, input.user_id));

    // Filter by parent folder if specified
    if (input.parent_folder_id !== undefined) {
      if (input.parent_folder_id === null) {
        // Get root folders (no parent)
        conditions.push(isNull(foldersTable.parent_folder_id));
      } else {
        // Get folders with specific parent
        conditions.push(eq(foldersTable.parent_folder_id, input.parent_folder_id));
      }
    }

    // Build and execute query in one chain
    const results = await db.select()
      .from(foldersTable)
      .where(and(...conditions))
      .orderBy(foldersTable.name)
      .execute();

    return results;
  } catch (error) {
    console.error('Get user folders failed:', error);
    throw error;
  }
};