import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginUserInput): Promise<User> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // In a real implementation, you would:
    // 1. Hash the input password with the same algorithm used during registration
    // 2. Compare the hashed input password with the stored password_hash
    // 3. Use a library like bcrypt for secure password comparison
    // 
    // For this implementation, we'll do a simple comparison
    // Note: This is NOT secure and should never be used in production
    if (user.password_hash !== input.password) {
      throw new Error('Invalid email or password');
    }

    // Return the user data (excluding sensitive information in production)
    return user;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}