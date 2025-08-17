import { type CreateTagInput, type Tag } from '../schema';

export async function createTag(input: CreateTagInput): Promise<Tag> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new tag for organizing notes.
    // Should validate tag name uniqueness per user and assign default color if not provided.
    return Promise.resolve({
        id: crypto.randomUUID(),
        name: input.name,
        color: input.color || null,
        user_id: input.user_id,
        created_at: new Date(),
        updated_at: new Date()
    } as Tag);
}