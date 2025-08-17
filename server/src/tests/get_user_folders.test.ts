import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable } from '../db/schema';
import { type GetUserFoldersInput } from '../schema';
import { getUserFolders } from '../handlers/get_user_folders';
import { eq } from 'drizzle-orm';

describe('getUserFolders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all folders for a user', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test folders
    await db.insert(foldersTable).values([
      {
        id: 'folder1',
        name: 'Folder A',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'folder2',
        name: 'Folder B',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: GetUserFoldersInput = {
      user_id: 'user1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Folder A'); // Ordered by name
    expect(result[1].name).toEqual('Folder B');
    expect(result[0].user_id).toEqual('user1');
    expect(result[1].user_id).toEqual('user1');
  });

  it('should return empty array when user has no folders', async () => {
    // Create test user without folders
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    const input: GetUserFoldersInput = {
      user_id: 'user1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(0);
  });

  it('should only return folders for specified user', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'user1',
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpass1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'user2',
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpass2',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create folders for both users
    await db.insert(foldersTable).values([
      {
        id: 'folder1',
        name: 'User1 Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'folder2',
        name: 'User2 Folder',
        user_id: 'user2',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: GetUserFoldersInput = {
      user_id: 'user1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('User1 Folder');
    expect(result[0].user_id).toEqual('user1');
  });

  it('should filter by parent folder when parent_folder_id is specified', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create hierarchical folder structure
    await db.insert(foldersTable).values([
      {
        id: 'parent1',
        name: 'Parent Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'child1',
        name: 'Child A',
        user_id: 'user1',
        parent_folder_id: 'parent1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'child2',
        name: 'Child B',
        user_id: 'user1',
        parent_folder_id: 'parent1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'root1',
        name: 'Root Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: GetUserFoldersInput = {
      user_id: 'user1',
      parent_folder_id: 'parent1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Child A'); // Ordered by name
    expect(result[1].name).toEqual('Child B');
    expect(result[0].parent_folder_id).toEqual('parent1');
    expect(result[1].parent_folder_id).toEqual('parent1');
  });

  it('should get root folders when parent_folder_id is null', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create hierarchical folder structure
    await db.insert(foldersTable).values([
      {
        id: 'root1',
        name: 'Root A',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'root2',
        name: 'Root B',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'child1',
        name: 'Child Folder',
        user_id: 'user1',
        parent_folder_id: 'root1',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: GetUserFoldersInput = {
      user_id: 'user1',
      parent_folder_id: null
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Root A'); // Ordered by name
    expect(result[1].name).toEqual('Root B');
    expect(result[0].parent_folder_id).toBeNull();
    expect(result[1].parent_folder_id).toBeNull();
  });

  it('should return empty array when parent folder has no children', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create parent folder without children
    await db.insert(foldersTable).values({
      id: 'parent1',
      name: 'Lonely Parent',
      user_id: 'user1',
      parent_folder_id: null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const input: GetUserFoldersInput = {
      user_id: 'user1',
      parent_folder_id: 'parent1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(0);
  });

  it('should return folders in alphabetical order by name', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create folders with names that will test ordering
    await db.insert(foldersTable).values([
      {
        id: 'folder1',
        name: 'Zebra Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'folder2',
        name: 'Apple Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'folder3',
        name: 'Banana Folder',
        user_id: 'user1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: GetUserFoldersInput = {
      user_id: 'user1'
    };

    const result = await getUserFolders(input);

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Apple Folder');
    expect(result[1].name).toEqual('Banana Folder');
    expect(result[2].name).toEqual('Zebra Folder');
  });

  it('should verify folders are saved correctly in database', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpass',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test folder
    const testDate = new Date();
    await db.insert(foldersTable).values({
      id: 'folder1',
      name: 'Test Folder',
      user_id: 'user1',
      parent_folder_id: null,
      created_at: testDate,
      updated_at: testDate
    });

    const input: GetUserFoldersInput = {
      user_id: 'user1'
    };

    const result = await getUserFolders(input);

    // Verify database data consistency
    const dbFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'folder1'))
      .execute();

    expect(dbFolders).toHaveLength(1);
    expect(dbFolders[0].name).toEqual('Test Folder');
    expect(dbFolders[0].user_id).toEqual('user1');
    expect(dbFolders[0].created_at).toBeInstanceOf(Date);
    expect(dbFolders[0].updated_at).toBeInstanceOf(Date);

    // Verify handler returns same data
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual(dbFolders[0].name);
    expect(result[0].user_id).toEqual(dbFolders[0].user_id);
    expect(result[0].id).toEqual(dbFolders[0].id);
  });
});