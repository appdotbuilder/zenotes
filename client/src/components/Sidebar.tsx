import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Heart, 
  Folder as FolderIcon, 
  Tag as TagIcon, 
  Plus, 
  LogOut, 
  User as UserIcon,
  FolderPlus,
  TagIcon as TagIconTwo
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Folder, Tag, CreateFolderInput, CreateTagInput } from '../../../server/src/schema';

interface SidebarProps {
  user: User;
  folders: Folder[];
  tags: Tag[];
  selectedFolder: string | null;
  selectedTag: string | null;
  searchQuery: string;
  showFavorites: boolean;
  onFolderSelect: (folderId: string | null) => void;
  onTagSelect: (tagId: string | null) => void;
  onSearchChange: (query: string) => void;
  onToggleFavorites: () => void;
  onLogout: () => void;
}

export function Sidebar({
  user,
  folders,
  tags,
  selectedFolder,
  selectedTag,
  searchQuery,
  showFavorites,
  onFolderSelect,
  onTagSelect,
  onSearchChange,
  onToggleFavorites,
  onLogout
}: SidebarProps) {
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8B5CF6');
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const folderData: CreateFolderInput = {
        name: newFolderName.trim(),
        user_id: user.id
      };
      
      await trpc.createFolder.mutate(folderData);
      setNewFolderName('');
      setIsFolderDialogOpen(false);
      // Note: In a real app, we'd refresh the folders list here
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const tagData: CreateTagInput = {
        name: newTagName.trim(),
        color: newTagColor,
        user_id: user.id
      };
      
      await trpc.createTag.mutate(tagData);
      setNewTagName('');
      setNewTagColor('#8B5CF6');
      setIsTagDialogOpen(false);
      // Note: In a real app, we'd refresh the tags list here
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const tagColors = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', 
    '#EF4444', '#3B82F6', '#8B5A2B', '#6B7280'
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
      {/* User section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {user.username}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-gray-500 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            className="pl-9 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick filters */}
          <div className="space-y-2">
            <Button
              variant={showFavorites ? "default" : "ghost"}
              className={`w-full justify-start ${
                showFavorites 
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400'
              }`}
              onClick={onToggleFavorites}
            >
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </Button>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Folders section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FolderIcon className="h-4 w-4" />
                Folders
              </h3>
              <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-purple-500">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FolderPlus className="h-5 w-5 text-purple-500" />
                      Create New Folder
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateFolder} className="space-y-4">
                    <Input
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
                      maxLength={100}
                      required
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isCreatingFolder}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                      >
                        {isCreatingFolder ? 'Creating...' : 'Create'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsFolderDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1">
              <Button
                variant={selectedFolder === null ? "secondary" : "ghost"}
                className={`w-full justify-start text-sm ${
                  selectedFolder === null 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => onFolderSelect(null)}
              >
                <FolderIcon className="h-4 w-4 mr-2" />
                All Notes
              </Button>

              {folders.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 pl-6 py-2">
                  📂 No folders yet - create one above!
                </div>
              ) : (
                folders.map((folder: Folder) => (
                  <Button
                    key={folder.id}
                    variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                    className={`w-full justify-start text-sm ${
                      selectedFolder === folder.id 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => onFolderSelect(folder.id)}
                  >
                    <FolderIcon className="h-4 w-4 mr-2" />
                    <span className="truncate">{folder.name}</span>
                  </Button>
                ))
              )}
            </div>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Tags section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Tags
              </h3>
              <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-blue-500">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <TagIconTwo className="h-5 w-5 text-blue-500" />
                      Create New Tag
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTag} className="space-y-4">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
                      maxLength={50}
                      required
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex gap-2 flex-wrap">
                        {tagColors.map((color: string) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              newTagColor === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                            } transition-all`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewTagColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={isCreatingTag}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
                      >
                        {isCreatingTag ? 'Creating...' : 'Create'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsTagDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1">
              {tags.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                  🏷️ No tags yet - create one above!
                </div>
              ) : (
                tags.map((tag: Tag) => (
                  <Button
                    key={tag.id}
                    variant={selectedTag === tag.id ? "secondary" : "ghost"}
                    className={`w-full justify-start text-sm ${
                      selectedTag === tag.id 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => onTagSelect(tag.id)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: tag.color || '#8B5CF6' }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </Button>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}