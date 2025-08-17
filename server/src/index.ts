import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schema types
import {
  createUserInputSchema,
  loginUserInputSchema,
  createFolderInputSchema,
  updateFolderInputSchema,
  deleteFolderInputSchema,
  getUserFoldersInputSchema,
  createTagInputSchema,
  updateTagInputSchema,
  deleteTagInputSchema,
  getUserTagsInputSchema,
  createNoteInputSchema,
  updateNoteInputSchema,
  deleteNoteInputSchema,
  getUserNotesInputSchema
} from './schema';

// Import all handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createFolder } from './handlers/create_folder';
import { getUserFolders } from './handlers/get_user_folders';
import { updateFolder } from './handlers/update_folder';
import { deleteFolder } from './handlers/delete_folder';
import { createTag } from './handlers/create_tag';
import { getUserTags } from './handlers/get_user_tags';
import { updateTag } from './handlers/update_tag';
import { deleteTag } from './handlers/delete_tag';
import { createNote } from './handlers/create_note';
import { getUserNotes } from './handlers/get_user_notes';
import { getNoteById } from './handlers/get_note_by_id';
import { updateNote } from './handlers/update_note';
import { deleteNote } from './handlers/delete_note';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Folder management routes
  createFolder: publicProcedure
    .input(createFolderInputSchema)
    .mutation(({ input }) => createFolder(input)),
  
  getUserFolders: publicProcedure
    .input(getUserFoldersInputSchema)
    .query(({ input }) => getUserFolders(input)),
  
  updateFolder: publicProcedure
    .input(updateFolderInputSchema)
    .mutation(({ input }) => updateFolder(input)),
  
  deleteFolder: publicProcedure
    .input(deleteFolderInputSchema)
    .mutation(({ input }) => deleteFolder(input)),

  // Tag management routes
  createTag: publicProcedure
    .input(createTagInputSchema)
    .mutation(({ input }) => createTag(input)),
  
  getUserTags: publicProcedure
    .input(getUserTagsInputSchema)
    .query(({ input }) => getUserTags(input)),
  
  updateTag: publicProcedure
    .input(updateTagInputSchema)
    .mutation(({ input }) => updateTag(input)),
  
  deleteTag: publicProcedure
    .input(deleteTagInputSchema)
    .mutation(({ input }) => deleteTag(input)),

  // Note management routes
  createNote: publicProcedure
    .input(createNoteInputSchema)
    .mutation(({ input }) => createNote(input)),
  
  getUserNotes: publicProcedure
    .input(getUserNotesInputSchema)
    .query(({ input }) => getUserNotes(input)),
  
  getNoteById: publicProcedure
    .input(z.object({
      noteId: z.string(),
      userId: z.string()
    }))
    .query(({ input }) => getNoteById(input.noteId, input.userId)),
  
  updateNote: publicProcedure
    .input(updateNoteInputSchema)
    .mutation(({ input }) => updateNote(input)),
  
  deleteNote: publicProcedure
    .input(deleteNoteInputSchema)
    .mutation(({ input }) => deleteNote(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();