'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ChevronDown } from 'lucide-react';
import { type PostCreate, updatePost, getAlbumsByCategory } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        id: string;
        title: string;
        description: string;
        category: string;
        album: string;
        tags: string[];
        price?: number | null;
        isActive?: boolean;
        isMajor?: boolean;
        contentUrl?: string;
        thumbnailUrl?: string | null;
        slug?: string;
    };
    onUpdate: (updatedPost: any) => void;
}

export default function EditPostModal({
    isOpen,
    onClose,
    post,
    onUpdate,
}: EditPostModalProps) {
    const { token: authToken } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<PostCreate>>({
        title: post.title,
        description: post.description,
        category: post.category,
        album: post.album,
        tags: post.tags,
        price: post.price,
        is_active: post.isActive,
        is_major: post.isMajor,
        slug: post.slug,
    });

    const [tagInput, setTagInput] = useState('');
    const [albumOptions, setAlbumOptions] = useState<string[]>([]);
    const [isAlbumDropdownOpen, setIsAlbumDropdownOpen] = useState(false);

    const isApparel = formData.category === 'apparel';
    const isProject = formData.category === 'projects';

    useEffect(() => {
        const fetchAlbums = async () => {
            if (formData.category) {
                try {
                    // Map category if needed (e.g. photo -> photography logic if specific backend requires it, but getAlbums usually takes generic)
                    // Backend usually expects 'photo' or 'art' etc.
                    const cat = formData.category === 'photo' ? 'photo' : formData.category;
                    const albums = await getAlbumsByCategory(cat);
                    setAlbumOptions(albums || []);
                } catch (e) {
                    console.error("Failed to fetch albums", e);
                }
            }
        };
        fetchAlbums();
    }, [formData.category]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleTagAdd = (e?: React.MouseEvent) => {
        if (tagInput.trim()) {
            if (!formData.tags?.includes(tagInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...(prev.tags || []), tagInput.trim()]
                }));
            }
            setTagInput('');
        }
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTagAdd();
        }
    };

    const handleTagRemove = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authToken) {
            setError("You must be logged in to edit posts.");
            return;
        }

        setIsLoading(true);
        setError(null);

        // If not apparel, ensure price is null
        const submitData = { ...formData };
        if (!isApparel) {
            submitData.price = null;
        }

        try {
            const updated = await updatePost(post.id, submitData, authToken);
            onUpdate(updated);
            onClose();
        } catch (err: any) {
            console.error("Failed to update post:", err);
            setError(err.message || "Failed to update post");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-2xl pointer-events-auto text-white">
                            <div className="flex items-center justify-between p-6 border-b border-white/20">
                                <h2 className="text-2xl font-bold text-white">Edit Post</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {error && (
                                    <div className="p-3 bg-red-500/20 border border-red-400/50 text-red-200 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Title & Slug */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Slug</label>
                                            <input
                                                type="text"
                                                name="slug"
                                                value={formData.slug || ''}
                                                readOnly
                                                disabled
                                                className="w-full p-3 border border-white/10 bg-white/5 text-white/50 rounded-lg cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Category</label>
                                            <input
                                                type="text"
                                                name="category"
                                                value={formData.category}
                                                readOnly
                                                disabled
                                                className="w-full p-3 border border-white/10 bg-white/5 text-white/50 rounded-lg cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Album</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAlbumDropdownOpen(!isAlbumDropdownOpen)}
                                                    className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 text-left flex justify-between items-center"
                                                >
                                                    <span className="text-sm">{formData.album || "No Album"}</span>
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isAlbumDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>

                                                <AnimatePresence>
                                                    {isAlbumDropdownOpen && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setIsAlbumDropdownOpen(false)} />
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="absolute z-20 w-full mt-2 overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, album: '' }));
                                                                        setIsAlbumDropdownOpen(false);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors text-white/50 border-b border-white/10"
                                                                >
                                                                    No Album
                                                                </button>
                                                                {albumOptions.map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData(prev => ({ ...prev, album: opt }));
                                                                            setIsAlbumDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${formData.album === opt ? 'text-white bg-white/10' : 'text-white'}`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price - Only show if apparel */}
                                    {isApparel && (
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Price (USD)</label>
                                            <input
                                                type="number"
                                                name="price"
                                                value={formData.price || ''}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="w-full p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}

                                    {/* Tags */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Tags</label>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={(e) => setTagInput(e.target.value)}
                                                    onKeyDown={handleTagInputKeyDown}
                                                    placeholder="Enter a tag and press Enter"
                                                    className="flex-1 p-3 border border-white/30 bg-white/10 text-white rounded-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleTagAdd()}
                                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-5 h-5 text-white" />
                                                </button>
                                            </div>
                                            {(formData.tags && formData.tags.length > 0) && (
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.tags.map(tag => (
                                                        <span key={tag} className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 border border-white/30 rounded-full text-sm text-white">
                                                            {tag}
                                                            <button type="button" onClick={() => handleTagRemove(tag)} className="hover:text-white/60 transition-colors">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <div className="flex-1">
                                                <label htmlFor="is_active" className={`font-medium block mb-1 ${!isProject ? 'text-white/50' : 'text-white'}`}>Active</label>
                                                <p className={`text-sm ${!isProject ? 'text-white/30' : 'text-white/60'}`}>
                                                    {!isProject ? 'Only editable for Projects' : 'Visible on the site'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={formData.is_active}
                                                disabled={!isProject}
                                                onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${!isProject
                                                    ? 'bg-white/5 cursor-not-allowed opacity-50'
                                                    : formData.is_active ? 'bg-green-500' : 'bg-white/20'}`}
                                            >
                                                <span className={`${formData.is_active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <div className="flex-1">
                                                <label htmlFor="is_major" className="text-white font-medium block mb-1">Featured</label>
                                                <p className="text-sm text-white/60">Large display tile</p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={formData.is_major}
                                                onClick={() => setFormData(prev => ({ ...prev, is_major: !prev.is_major }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${formData.is_major ? 'bg-blue-500' : 'bg-white/20'}`}
                                            >
                                                <span className={`${formData.is_major ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-white/20">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
