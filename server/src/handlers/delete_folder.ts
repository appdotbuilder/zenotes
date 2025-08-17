import { db } from '../db';
import { foldersTable, notesTable } from '../db/schema';
import { type DeleteFolderInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteFolder = async (input: DeleteFolderInput): Promise<{ success: boolean }> => {
  try {
    // First, verify the folder exists and belongs to the user
    const folder = await db.select()
      .from(foldersTable)
      .where(and(
        eq(foldersTable.id, input.id),
        eq(foldersTable.user_id, input.user_id)
      ))
      .execute();

    if (folder.length === 0) {
      throw new Error('Folder not found or access denied');
    }

    const folderToDelete = folder[0];

    // Move all notes from this folder to its parent folder (or null if root)
    await db.update(notesTable)
      .set({ folder_id: folderToDelete.parent_folder_id })
      .where(eq(notesTable.folder_id, input.id))
      .execute();

    // Move all subfolders to the parent folder (or null if root)
    await db.update(foldersTable)
      .set({ parent_folder_id: folderToDelete.parent_folder_id })
      .where(eq(foldersTable.parent_folder_id, input.id))
      .execute();

    // Delete the folder itself
    await db.delete(foldersTable)
      .where(and(
        eq(foldersTable.id, input.id),
        eq(foldersTable.user_id, input.user_id)
      ))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Folder deletion failed:', error);
    throw error;
  }
};