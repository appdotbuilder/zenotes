import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Trash2, Heart, HeartOff, FileText, Clock } from 'lucide-react';
import { useState } from 'react';
import type { Note } from '../../../server/src/schema';

interface NoteListProps {
  notes: Note[];
  selectedNote: Note | null;
  onNoteSelect: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  isLoading: boolean;
}

export function NoteList({
  notes,
  selectedNote,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  isLoading
}: NoteListProps) {
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return noteDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return noteDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPreviewText = (content: string) => {
    return content.replace(/[#*_`]/g, '').substring(0, 100);
  };

  const handleDelete = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  const confirmDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id);
      setNoteToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notes
          </h2>
          <Button
            size="sm"
            onClick={onCreateNote}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {notes.length === 0 ? 'No notes found' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Note list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map((i: number) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 h-20 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <div className="text-lg mb-2">No notes here yet</div>
            <div className="text-sm mb-4">Create your first note to get started!</div>
            <Button
              onClick={onCreateNote}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {notes.map((note: Note) => (
              <div
                key={note.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer border transition-all duration-200 group hover:shadow-md ${
                  selectedNote?.id === note.id
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-300 dark:border-purple-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                onClick={() => onNoteSelect(note)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                        {note.title || 'Untitled Note'}
                      </h3>
                      {note.is_favorite && (
                        <Heart className="h-3 w-3 text-pink-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {getPreviewText(note.content) || 'No content'}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(note.updated_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            // Toggle favorite functionality would go here
                          }}
                          className="cursor-pointer"
                        >
                          {note.is_favorite ? (
                            <>
                              <HeartOff className="h-4 w-4 mr-2" />
                              Remove from favorites
                            </>
                          ) : (
                            <>
                              <Heart className="h-4 w-4 mr-2" />
                              Add to favorites
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => handleDelete(note, e)}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete note
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Note
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title || 'this note'}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}