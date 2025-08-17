import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if user with email or username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(or(
        eq(usersTable.email, input.email),
        eq(usersTable.username, input.username)
      ))
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.email === input.email) {
        throw new Error('User with this email already exists');
      }
      if (existingUser.username === input.username) {
        throw new Error('User with this username already exists');
      }
    }

    // Hash the password using PBKDF2
    const salt = randomBytes(32).toString('hex');
    const hash = pbkdf2Sync(input.password, salt, 10000, 64, 'sha512').toString('hex');
    const password_hash = `${salt}:${hash}`;

    // Generate unique ID
    const id = crypto.randomUUID();

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        id,
        email: input.email,
        username: input.username,
        password_hash
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};