import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Heart, 
  HeartOff, 
  Save, 
  Eye, 
  Edit3, 
  Bold, 
  Italic, 
  List, 
  Link,
  Heading,
  Code,
  Quote,
  Hash
} from 'lucide-react';
import type { Note, Tag } from '../../../server/src/schema';

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  tags: Tag[];
}

export function NoteEditor({ note, onUpdateNote, tags }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [activeTab, setActiveTab] = useState('edit');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setHasChanges(false);
  }, [note.id, note.title, note.content]);

  // Track changes
  useEffect(() => {
    const changed = title !== note.title || content !== note.content;
    setHasChanges(changed);
  }, [title, content, note.title, note.content]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, hasChanges]);

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await onUpdateNote(note.id, {
        title: title.trim() || 'Untitled Note',
        content
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = async () => {
    await onUpdateNote(note.id, {
      is_favorite: !note.is_favorite
    });
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown renderer - in a real app, you'd use a proper markdown library
    let html = text
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-2">$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-500 hover:underline" target="_blank">$1</a>');

    // Convert newlines to <br> tags
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <Input
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-xl font-semibold border-none bg-transparent px-0 focus-visible:ring-0 text-gray-900 dark:text-gray-100"
          />
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFavorite}
              className={`${
                note.is_favorite 
                  ? 'text-pink-500 hover:text-pink-600' 
                  : 'text-gray-400 hover:text-pink-500'
              }`}
            >
              {note.is_favorite ? (
                <Heart className="h-4 w-4 fill-current" />
              ) : (
                <HeartOff className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`${
                hasChanges 
                  ? 'text-green-500 hover:text-green-600' 
                  : 'text-gray-400'
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Created: {formatDate(note.created_at)}</span>
            <span>Updated: {formatDate(note.updated_at)}</span>
          </div>
          
          {/* Note: Tags would be displayed here in a real implementation */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              <div className="flex gap-1">
                {tags.slice(0, 3).map((tag: Tag) => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary" 
                    className="text-xs"
                    style={{ backgroundColor: `${tag.color || '#8B5CF6'}20`, color: tag.color || '#8B5CF6' }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4">
              <TabsList className="grid grid-cols-2 w-48 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger 
                  value="edit"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </TabsTrigger>
                <TabsTrigger 
                  value="preview"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {activeTab === 'edit' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('**', '**')}
                    className="h-8 w-8 p-0"
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('*', '*')}
                    className="h-8 w-8 p-0"
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('# ')}
                    className="h-8 w-8 p-0"
                    title="Heading"
                  >
                    <Heading className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('`', '`')}
                    className="h-8 w-8 p-0"
                    title="Code"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('> ')}
                    className="h-8 w-8 p-0"
                    title="Quote"
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('- ')}
                    className="h-8 w-8 p-0"
                    title="List"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMarkdown('[Link Text](', ')')}
                    className="h-8 w-8 p-0"
                    title="Link"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="edit" className="flex-1 m-0">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Start writing your note... ✨

You can use Markdown formatting:
# Heading
**bold text**
*italic text*
- List item
> Quote
`code`
[Link](url)"
              className="h-full resize-none border-none focus-visible:ring-0 text-base leading-relaxed p-4 bg-transparent"
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 m-0">
            <ScrollArea className="h-full">
              {content.trim() ? (
                <div 
                  className="p-4 prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              ) : (
                <div className="p-4 h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <div className="text-lg mb-2">Nothing to preview yet</div>
                    <div className="text-sm">Switch to Edit tab to start writing!</div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}