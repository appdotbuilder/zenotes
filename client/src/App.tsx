import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Note, Folder, Tag, CreateNoteInput, LoginUserInput } from '../../server/src/schema';
import { AuthForm } from '@/components/AuthForm';
import { Sidebar } from '@/components/Sidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { NoteList } from '@/components/NoteList';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, X } from 'lucide-react';

function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // UI state
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data state
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  // Load user data
  const loadUserData = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const [userNotes, userFolders, userTags] = await Promise.all([
        trpc.getUserNotes.query({ user_id: userId }),
        trpc.getUserFolders.query({ user_id: userId }),
        trpc.getUserTags.query({ user_id: userId })
      ]);

      setNotes(userNotes);
      setFolders(userFolders);
      setTags(userTags);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle login
  const handleLogin = async (loginData: LoginUserInput) => {
    setIsAuthLoading(true);
    try {
      const loggedInUser = await trpc.loginUser.mutate(loginData);
      setUser(loggedInUser);
      await loadUserData(loggedInUser.id);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle note creation
  const handleCreateNote = async (noteData: CreateNoteInput) => {
    if (!user) return;

    try {
      const newNote = await trpc.createNote.mutate(noteData);
      setNotes((prev: Note[]) => [newNote, ...prev]);
      setSelectedNote(newNote);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  // Handle note update
  const handleUpdateNote = async (noteId: string, updates: Partial<Note>) => {
    if (!user) return;

    try {
      const updatedNote = await trpc.updateNote.mutate({
        id: noteId,
        ...updates
      });
      
      setNotes((prev: Note[]) => 
        prev.map((note: Note) => note.id === noteId ? updatedNote : note)
      );
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      await trpc.deleteNote.mutate({
        id: noteId,
        user_id: user.id
      });
      
      setNotes((prev: Note[]) => prev.filter((note: Note) => note.id !== noteId));
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  // Filter notes based on current filters
  const filteredNotes = notes.filter((note: Note) => {
    if (selectedFolder && note.folder_id !== selectedFolder) return false;
    if (showFavorites && !note.is_favorite) return false;
    if (searchQuery && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !note.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Note: Tag filtering would require note-tag relationships from backend
    return true;
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Show authentication form if not logged in
  if (!user) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
              className="text-gray-600 dark:text-gray-300"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                ✨ NoteFlow
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Your modern note-taking companion
              </p>
            </div>
            
            <AuthForm 
              onLogin={handleLogin}
              isLoading={isAuthLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-white dark:bg-gray-900 flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700`}>
          <Sidebar
            user={user}
            folders={folders}
            tags={tags}
            selectedFolder={selectedFolder}
            selectedTag={selectedTag}
            searchQuery={searchQuery}
            showFavorites={showFavorites}
            onFolderSelect={setSelectedFolder}
            onTagSelect={setSelectedTag}
            onSearchChange={setSearchQuery}
            onToggleFavorites={() => setShowFavorites(!showFavorites)}
            onLogout={() => setUser(null)}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-600 dark:text-gray-300"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              
              <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                ✨ NoteFlow
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className="text-gray-600 dark:text-gray-300"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {user.username}! 👋
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex">
            {/* Note list */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <NoteList
                notes={filteredNotes}
                selectedNote={selectedNote}
                onNoteSelect={setSelectedNote}
                onCreateNote={() => {
                  if (user) {
                    handleCreateNote({
                      title: 'New Note',
                      content: '',
                      user_id: user.id,
                      folder_id: selectedFolder
                    });
                  }
                }}
                onDeleteNote={handleDeleteNote}
                isLoading={isLoading}
              />
            </div>

            {/* Note editor */}
            <div className="flex-1">
              {selectedNote ? (
                <NoteEditor
                  note={selectedNote}
                  onUpdateNote={handleUpdateNote}
                  tags={tags}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <div className="text-xl mb-2">Select a note to get started</div>
                    <div className="text-sm">Or create a new one from the sidebar</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;