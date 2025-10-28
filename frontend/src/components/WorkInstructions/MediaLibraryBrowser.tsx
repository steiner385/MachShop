import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Image,
  Video,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Eye,
  Edit,
  Tag,
  Calendar,
  FileSize,
  User,
  MoreHorizontal,
  X,
  Check,
  Star,
  Copy,
  Move,
  Share,
  Info,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';

// ✅ GITHUB ISSUE #18 - Phase 4: MediaLibraryBrowser Component

interface MediaItem {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
  fileSize: number;
  mimeType: string;
  description?: string;
  tags: string[];
  folderId?: string;
  workInstructionId?: string;
  stepId?: string;
  uploadedAt: Date;
  uploadedBy: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    fps?: number;
  };
  isFavorite: boolean;
  isPublic: boolean;
}

interface MediaFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: Date;
  createdBy: {
    id: string;
    username: string;
  };
  itemCount: number;
  totalSize: number;
}

interface MediaLibraryBrowserProps {
  workInstructionId?: string;
  stepId?: string;
  initialSelection?: string[];
  onSelect?: (items: MediaItem[]) => void;
  onUpload?: (files: File[], folderId?: string) => Promise<MediaItem[]>;
  onCreateFolder?: (name: string, parentId?: string) => Promise<MediaFolder>;
  onDeleteItems?: (itemIds: string[]) => Promise<void>;
  onUpdateItem?: (itemId: string, updates: Partial<MediaItem>) => Promise<MediaItem>;
  multiSelect?: boolean;
  allowUpload?: boolean;
  allowFolders?: boolean;
  readOnly?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'uploadedAt' | 'fileSize' | 'mediaType';
type SortOrder = 'asc' | 'desc';

const MediaLibraryBrowser: React.FC<MediaLibraryBrowserProps> = ({
  workInstructionId,
  stepId,
  initialSelection = [],
  onSelect,
  onUpload,
  onCreateFolder,
  onDeleteItems,
  onUpdateItem,
  multiSelect = false,
  allowUpload = true,
  allowFolders = true,
  readOnly = false,
  className = '',
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelection);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      folderName: '',
      newFolderDescription: '',
    },
  });

  // File upload handling
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!onUpload || readOnly) return;

      setIsLoading(true);
      try {
        // Simulate upload progress
        acceptedFiles.forEach((file) => {
          const fileId = `${Date.now()}-${file.name}`;
          setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              const currentProgress = prev[fileId] || 0;
              if (currentProgress >= 100) {
                clearInterval(progressInterval);
                return prev;
              }
              return { ...prev, [fileId]: currentProgress + 10 };
            });
          }, 200);
        });

        const uploadedItems = await onUpload(acceptedFiles, currentFolder || undefined);
        setMediaItems((prev) => [...prev, ...uploadedItems]);
      } catch (error) {
        console.error('Failed to upload files:', error);
      } finally {
        setIsLoading(false);
        setShowUploadModal(false);
      }
    },
    [onUpload, currentFolder, readOnly]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    disabled: !allowUpload || readOnly,
  });

  // Filter and sort media items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = mediaItems.filter((item) => {
      // Folder filter
      if (item.folderId !== currentFolder) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          item.fileName.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Media type filter
      if (selectedMediaType && item.mediaType !== selectedMediaType) return false;

      // Tags filter
      if (selectedTags.length > 0) {
        const hasMatchingTag = selectedTags.some((tag) => item.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.fileName.toLowerCase();
          bValue = b.fileName.toLowerCase();
          break;
        case 'uploadedAt':
          aValue = new Date(a.uploadedAt).getTime();
          bValue = new Date(b.uploadedAt).getTime();
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'mediaType':
          aValue = a.mediaType;
          bValue = b.mediaType;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [mediaItems, currentFolder, searchTerm, selectedMediaType, selectedTags, sortBy, sortOrder]);

  // Get current folder path
  const folderPath = useMemo(() => {
    const path: MediaFolder[] = [];
    let folderId = currentFolder;

    while (folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        path.unshift(folder);
        folderId = folder.parentId;
      } else {
        break;
      }
    }

    return path;
  }, [currentFolder, folders]);

  // Get available tags
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    mediaItems.forEach((item) => {
      item.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [mediaItems]);

  // Handle item selection
  const handleItemSelect = useCallback(
    (item: MediaItem, isSelected: boolean) => {
      if (!multiSelect) {
        const newSelection = isSelected ? [item.id] : [];
        setSelectedItems(newSelection);
        onSelect?.([item]);
        return;
      }

      const newSelection = isSelected
        ? [...selectedItems, item.id]
        : selectedItems.filter((id) => id !== item.id);

      setSelectedItems(newSelection);
      const selectedMediaItems = mediaItems.filter((item) => newSelection.includes(item.id));
      onSelect?.(selectedMediaItems);
    },
    [multiSelect, selectedItems, mediaItems, onSelect]
  );

  // Handle preview
  const handlePreview = useCallback((item: MediaItem) => {
    setPreviewItem(item);
    setShowPreview(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (itemIds: string[]) => {
      if (!onDeleteItems || readOnly) return;

      try {
        await onDeleteItems(itemIds);
        setMediaItems((prev) => prev.filter((item) => !itemIds.includes(item.id)));
        setSelectedItems((prev) => prev.filter((id) => !itemIds.includes(id)));
      } catch (error) {
        console.error('Failed to delete items:', error);
      }
    },
    [onDeleteItems, readOnly]
  );

  // Handle create folder
  const handleCreateFolder = useCallback(
    async (data: { folderName: string; newFolderDescription: string }) => {
      if (!onCreateFolder || !data.folderName.trim()) return;

      try {
        const newFolder = await onCreateFolder(data.folderName, currentFolder || undefined);
        setFolders((prev) => [...prev, newFolder]);
        reset();
        setShowCreateFolderModal(false);
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    },
    [onCreateFolder, currentFolder, reset]
  );

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get media type icon
  const getMediaTypeIcon = useCallback((mediaType: string) => {
    switch (mediaType) {
      case 'IMAGE':
        return Image;
      case 'VIDEO':
        return Video;
      case 'AUDIO':
        return Volume2;
      case 'DOCUMENT':
      default:
        return FileText;
    }
  }, []);

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Media Library</h1>

            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => setCurrentFolder(null)}
                className="hover:text-gray-700"
              >
                Root
              </button>
              {folderPath.map((folder) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => setCurrentFolder(folder.id)}
                    className="hover:text-gray-700"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-md border border-gray-300">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Button */}
            {allowUpload && !readOnly && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </button>
            )}

            {/* Create Folder Button */}
            {allowFolders && !readOnly && (
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Media Type Filter */}
          <select
            value={selectedMediaType}
            onChange={(e) => setSelectedMediaType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
            <option value="AUDIO">Audio</option>
            <option value="DOCUMENT">Documents</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [SortBy, SortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="uploadedAt-desc">Newest First</option>
            <option value="uploadedAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="fileSize-desc">Largest First</option>
            <option value="fileSize-asc">Smallest First</option>
          </select>

          {/* Selected Items Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-500">{selectedItems.length} selected</span>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(selectedItems)}
                  className="p-2 text-red-400 hover:text-red-600"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {/* Folders */}
        {allowFolders && folders.filter(f => f.parentId === currentFolder).length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {folders
                .filter((folder) => folder.parentId === currentFolder)
                .map((folder) => (
                  <div
                    key={folder.id}
                    onDoubleClick={() => setCurrentFolder(folder.id)}
                    className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <FolderOpen className="w-12 h-12 text-blue-500 mb-2" />
                      <h4 className="text-sm font-medium text-gray-900 truncate w-full">
                        {folder.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {folder.itemCount} items
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Media Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Media Files ({filteredAndSortedItems.length})
            </h3>
          </div>

          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No media files found</p>
              <p className="text-sm">Upload files or adjust your filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredAndSortedItems.map((item) => {
                const Icon = getMediaTypeIcon(item.mediaType);
                const isSelected = selectedItems.includes(item.id);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                    }`}
                    onClick={() => handleItemSelect(item, !isSelected)}
                  >
                    <div className="relative aspect-square">
                      {item.mediaType === 'IMAGE' ? (
                        <img
                          src={item.thumbnailUrl || item.fileUrl}
                          alt={item.fileName}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-t-lg flex items-center justify-center">
                          <Icon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(item);
                            }}
                            className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          {!readOnly && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete([item.id]);
                              }}
                              className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Favorite Star */}
                      {item.isFavorite && (
                        <div className="absolute bottom-2 right-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h4 className="text-sm font-medium text-gray-900 truncate" title={item.fileName}>
                        {item.fileName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{formatFileSize(item.fileSize)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-8 px-6 py-3"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedItems.map((item) => {
                    const Icon = getMediaTypeIcon(item.mediaType);
                    const isSelected = selectedItems.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleItemSelect(item, !isSelected)}
                      >
                        <td className="px-6 py-4">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {item.mediaType === 'IMAGE' ? (
                                <img
                                  src={item.thumbnailUrl || item.fileUrl}
                                  alt={item.fileName}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.fileName}
                              </div>
                              {item.description && (
                                <div className="text-sm text-gray-500">{item.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.mediaType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(item.fileSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.uploadedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(item);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!readOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete([item.id]);
                                }}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : ''
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-lg text-blue-600">Drop files here...</p>
                ) : (
                  <div>
                    <p className="text-lg text-gray-600">Drag and drop files here, or click to select</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports images, videos, audio, and documents (max 100MB)
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Folder Modal */}
      <AnimatePresence>
        {showCreateFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            >
              <form onSubmit={handleSubmit(handleCreateFolder)}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create Folder</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folder Name
                    </label>
                    <Controller
                      name="folderName"
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter folder name"
                          autoFocus
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <Controller
                      name="newFolderDescription"
                      control={control}
                      render={({ field }) => (
                        <textarea
                          {...field}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter folder description"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          >
            <div className="max-w-7xl max-h-full w-full h-full p-4 flex flex-col">
              {/* Preview Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-white">
                  <h3 className="text-lg font-medium">{previewItem.fileName}</h3>
                  <p className="text-sm text-gray-300">
                    {formatFileSize(previewItem.fileSize)} • {previewItem.mediaType}
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 flex items-center justify-center">
                {previewItem.mediaType === 'IMAGE' ? (
                  <img
                    src={previewItem.fileUrl}
                    alt={previewItem.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : previewItem.mediaType === 'VIDEO' ? (
                  <video
                    src={previewItem.fileUrl}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : previewItem.mediaType === 'AUDIO' ? (
                  <audio src={previewItem.fileUrl} controls className="w-full max-w-md" />
                ) : (
                  <div className="text-center text-white">
                    <FileText className="w-24 h-24 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg">Preview not available for this file type</p>
                    <p className="text-sm text-gray-300 mt-2">
                      Download the file to view its contents
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaLibraryBrowser;