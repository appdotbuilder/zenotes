import { db } from '../db';
import { foldersTable, usersTable } from '../db/schema';
import { type CreateFolderInput, type Folder } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  try {
    // Verify user exists
    const userExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // If parent_folder_id is specified, verify it exists and belongs to the user
    if (input.parent_folder_id) {
      const parentFolderExists = await db.select({ id: foldersTable.id })
        .from(foldersTable)
        .where(and(
          eq(foldersTable.id, input.parent_folder_id),
          eq(foldersTable.user_id, input.user_id)
        ))
        .execute();

      if (parentFolderExists.length === 0) {
        throw new Error('Parent folder not found or does not belong to user');
      }
    }

    // Generate unique ID
    const folderId = crypto.randomUUID();

    // Insert folder record
    const result = await db.insert(foldersTable)
      .values({
        id: folderId,
        name: input.name,
        user_id: input.user_id,
        parent_folder_id: input.parent_folder_id || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Folder creation failed:', error);
    throw error;
  }
}