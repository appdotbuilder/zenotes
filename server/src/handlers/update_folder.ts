import { db } from '../db';
import { foldersTable } from '../db/schema';
import { type UpdateFolderInput, type Folder } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateFolder = async (input: UpdateFolderInput): Promise<Folder> => {
  try {
    // First, get the current folder to validate ownership and get user_id
    const existingFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, input.id))
      .execute();

    if (existingFolders.length === 0) {
      throw new Error('Folder not found');
    }

    const currentFolder = existingFolders[0];

    // Check for circular reference if parent_folder_id is being updated
    if (input.parent_folder_id !== undefined && input.parent_folder_id !== null) {
      await validateNoCircularReference(input.id, input.parent_folder_id);
    }

    // Prepare update data
    const updateData: Partial<typeof foldersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.parent_folder_id !== undefined) {
      updateData.parent_folder_id = input.parent_folder_id;
    }

    // Update the folder
    const result = await db.update(foldersTable)
      .set(updateData)
      .where(eq(foldersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Folder update failed:', error);
    throw error;
  }
};

// Helper function to prevent circular references
async function validateNoCircularReference(folderId: string, newParentId: string): Promise<void> {
  // Check if newParentId is the same as folderId (direct self-reference)
  if (folderId === newParentId) {
    throw new Error('Cannot set folder as its own parent');
  }

  // Traverse up the hierarchy from newParentId to check for cycles
  let currentParentId: string | null = newParentId;
  const visitedIds = new Set<string>();

  while (currentParentId !== null) {
    // If we've seen this ID before, we have a cycle
    if (visitedIds.has(currentParentId)) {
      throw new Error('Circular reference detected in folder hierarchy');
    }

    // If we encounter the folder we're trying to update, it would create a cycle
    if (currentParentId === folderId) {
      throw new Error('Cannot create circular reference in folder hierarchy');
    }

    visitedIds.add(currentParentId);

    // Get the parent of the current folder
    const parentFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, currentParentId))
      .execute();

    if (parentFolders.length === 0) {
      // Parent folder doesn't exist
      throw new Error('Parent folder not found');
    }

    currentParentId = parentFolders[0].parent_folder_id;
  }
}