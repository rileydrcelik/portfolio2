'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileUp } from 'lucide-react';
import { type InstagramDetails, type PostCreate, updatePost, getAlbumsByCategory, uploadImage, publishPostToInstagram } from '@/lib/api';
import InstagramDetailsFields, { instagramDetailsPayload, instagramDetailsValue } from './InstagramDetailsFields';
import MarkdownEditor from './MarkdownEditor';
import { useAuth } from '@/providers/AuthProvider';
import ShopListingFields, { shopListingError, shopListingPayload, type ShopListingValue } from '@/components/ecommerce/ShopListingFields';
import ListingPhotosEditor, { listingPhotosFromUrls, uploadListingPhotos } from '@/components/ecommerce/ListingPhotosEditor';
import { getCategoryConfig } from '@/lib/categories';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        id: string;
        title: string;
        description: string;
        category: string;
        album: string;
        price?: number | null;
        isActive?: boolean;
        isMajor?: boolean;
        contentUrl?: string;
        thumbnailUrl?: string | null;
        galleryUrls?: string[];
        slug?: string;
        crossPostAlbums?: string[];
        postType?: string;
        printifyProductId?: string | null;
        listingType?: 'printify' | 'meetup' | null;
        stock?: number | null;
        acceptsOffers?: boolean;
        fbMarketplaceUrl?: string | null;
        mirrorToAiko?: boolean;
        instagramMediaId?: string | null;
        instagramDetails?: Partial<InstagramDetails> | null;
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

    const [formData, setFormData] = useState<Partial<PostCreate> & { cross_post_albums?: string[] }>({
        title: post.title,
        description: post.description || '',
        category: post.category,
        album: post.album,
        price: post.price,
        is_active: post.isActive,
        is_major: post.isMajor,
        slug: post.slug,
        cross_post_albums: post.crossPostAlbums || [],
        mirror_to_aiko: post.mirrorToAiko ?? true,
    });

    // Posting an existing photo to Instagram is its own action, not part of
    // Save: it goes out immediately and can't be taken back.
    const [instagramMediaId, setInstagramMediaId] = useState(post.instagramMediaId ?? null);
    const [isPostingToInstagram, setIsPostingToInstagram] = useState(false);
    const [instagramError, setInstagramError] = useState<string | null>(null);
    const [instagramDetails, setInstagramDetails] = useState(() => instagramDetailsValue(post.instagramDetails));

    // How a shop post is sold. Posts from before meetup items were Printify.
    const [shopListing, setShopListing] = useState<ShopListingValue>({
        listing_type: post.listingType ?? 'printify',
        printify_product_id: post.printifyProductId ?? null,
        price: post.price ?? null,
        stock: post.stock ?? null,
        accepts_offers: post.acceptsOffers ?? false,
        fb_marketplace_url: post.fbMarketplaceUrl ?? null,
    });

    // Older listings may have no gallery; their one photo is content_url.
    const [listingPhotos, setListingPhotos] = useState(() =>
        listingPhotosFromUrls(post.galleryUrls?.length ? post.galleryUrls : post.contentUrl ? [post.contentUrl] : [])
    );

    const [albumOptions, setAlbumOptions] = useState<string[]>([]);
const [articleContent, setArticleContent] = useState(post.contentUrl || '');
    const [replacementFile, setReplacementFile] = useState<File | null>(null);

    const isShop = formData.category === 'apparel';
    // Shown by the name the site uses: shop posts are stored as 'apparel'.
    const categoryTitle = getCategoryConfig(isShop ? 'shop' : formData.category)?.title ?? formData.category ?? '';
    const isProject = formData.category === 'projects';
    const canMirrorToAiko = formData.category === 'art' || formData.category === 'photo';
    // Judged on the saved post: the server publishes what's stored, not what's
    // in this form, so an unsaved Aiko switch doesn't count yet.
    const isSavedPhoto = post.category === 'photo' && formData.category === 'photo';
    const savedToAiko = post.mirrorToAiko ?? true;
    // Only editable until the post is on Instagram: nothing reads them after.
    const editsInstagramDetails = isSavedPhoto && !instagramMediaId && !!formData.mirror_to_aiko;
    // File posts (e.g. a resume PDF) keep the file itself in content_url.
    const isFilePost = post.postType === 'file' || /\.pdf$/i.test(post.contentUrl || '');
    const currentFileName = post.contentUrl ? decodeURIComponent(post.contentUrl.split('/').pop() || '') : '';

    const handleEditorImageUpload = async (file: File): Promise<string> => {
        if (!authToken) {
            throw new Error('You must be signed in to upload images.');
        }
        // Use 'projects' folder for project images, or generic 'art'
        try {
            const uploadResult = await uploadImage(file, 'projects', authToken);
            return uploadResult.url;
        } catch (err: any) {
            console.error("Editor image upload failed", err);
            throw new Error(err.message || "Failed to upload image");
        }
    };

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

    const handlePostToInstagram = async () => {
        if (!authToken) {
            setInstagramError('You must be logged in to post to Instagram.');
            return;
        }
        if (!window.confirm('Post this photo to Instagram now? It can\'t be deleted or edited from here afterwards.')) {
            return;
        }
        setIsPostingToInstagram(true);
        setInstagramError(null);
        try {
            // The server publishes what's stored, so the details go in first.
            await updatePost(post.id, instagramDetailsPayload(instagramDetails), authToken);
            const updated = await publishPostToInstagram(post.id, authToken);
            setInstagramMediaId(updated.instagram_media_id ?? 'posted');
            onUpdate(updated);
        } catch (err: any) {
            console.error('Failed to post to Instagram:', err);
            setInstagramError(err.message || 'Failed to post to Instagram');
        } finally {
            setIsPostingToInstagram(false);
        }
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
        if (!isShop) {
            submitData.price = null;
        } else {
            const listingError = shopListingError(shopListing)
                ?? (listingPhotos.length === 0 ? 'A listing needs at least one photo.' : null);
            if (listingError) {
                setError(listingError);
                setIsLoading(false);
                return;
            }
            // A Printify product's price comes from Printify (the backend
            // refreshes it on save); a meetup item's from the listing fields.
            delete submitData.price;
            Object.assign(submitData, shopListingPayload(shopListing));
        }

        // For projects, include the article content as content_url
        if (isProject) {
            submitData.content_url = articleContent;
        }

        if (editsInstagramDetails) {
            Object.assign(submitData, instagramDetailsPayload(instagramDetails));
        }

        try {
            if (isFilePost && replacementFile) {
                const uploadResult = await uploadImage(replacementFile, 'documents', authToken);
                submitData.content_url = uploadResult.url;
            }
            if (isShop) {
                // The first photo is the thumbnail everywhere the listing shows.
                const urls = await uploadListingPhotos(listingPhotos, authToken);
                Object.assign(submitData, {
                    gallery_urls: urls,
                    content_url: urls[0],
                    thumbnail_url: urls[0],
                    splash_image_url: urls[0],
                });
            }
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

                                    {/* Article Content - Only for Projects */}
                                    {isProject && (
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Article Content (Markdown)</label>
                                            <div className="h-[500px] overflow-hidden rounded-2xl border border-white/20">
                                                <MarkdownEditor
                                                    value={articleContent}
                                                    onChange={setArticleContent}
                                                    onUploadImage={handleEditorImageUpload}
                                                    placeholder="Write your project details here..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Replace File - Only for file posts */}
                                    {isFilePost && (
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">File</label>
                                            <div className="flex items-center gap-3 p-3 border border-white/30 bg-white/10 rounded-lg">
                                                <p className="flex-1 min-w-0 truncate text-sm text-white/80">
                                                    {replacementFile ? replacementFile.name : currentFileName || 'No file'}
                                                </p>
                                                {replacementFile && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplacementFile(null)}
                                                        className="text-sm text-white/60 hover:text-white transition-colors"
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                                <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg transition-colors cursor-pointer">
                                                    <FileUp className="w-4 h-4" />
                                                    Replace file
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) setReplacementFile(file);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            {replacementFile && (
                                                <p className="mt-2 text-xs text-white/50">The new file uploads when you save.</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Category</label>
                                            <input
                                                type="text"
                                                name="category"
                                                value={categoryTitle}
                                                readOnly
                                                disabled
                                                className="w-full p-3 border border-white/10 bg-white/5 text-white/50 rounded-lg cursor-not-allowed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Albums</label>
                                            <div className="space-y-1">
                                                {albumOptions.map(opt => {
                                                    const isSelected = formData.album === opt || formData.cross_post_albums?.includes(opt);
                                                    return (
                                                        <label key={opt} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected || false}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        if (!formData.album) {
                                                                            setFormData(prev => ({ ...prev, album: opt }));
                                                                        } else {
                                                                            setFormData(prev => ({ ...prev, cross_post_albums: [...(prev.cross_post_albums || []), opt] }));
                                                                        }
                                                                    } else {
                                                                        if (formData.album === opt) {
                                                                            const [newPrimary, ...rest] = formData.cross_post_albums || [];
                                                                            setFormData(prev => ({ ...prev, album: newPrimary || '', cross_post_albums: rest }));
                                                                        } else {
                                                                            setFormData(prev => ({ ...prev, cross_post_albums: (prev.cross_post_albums || []).filter(a => a !== opt) }));
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded border-white/30 bg-white/10 text-white accent-white"
                                                            />
                                                            <span className="text-sm text-white/80">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {isShop && (
                                        <ListingPhotosEditor
                                            photos={listingPhotos}
                                            onChange={setListingPhotos}
                                            disabled={isLoading}
                                        />
                                    )}

                                    {/* Shop: what this post sells, and at what price */}
                                    {isShop && (
                                        <ShopListingFields
                                            value={shopListing}
                                            onChange={(patch) => setShopListing(prev => ({ ...prev, ...patch }))}
                                            authToken={authToken}
                                        />
                                    )}

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

                                        {canMirrorToAiko && (
                                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                                <div className="flex-1">
                                                    <label htmlFor="mirror_to_aiko" className="text-white font-medium block mb-1">Post to Aiko</label>
                                                    <p className="text-sm text-white/60">
                                                        {formData.mirror_to_aiko ? 'Pinned on Aiko and kept in sync' : 'Not on Aiko; saving removes the pin'}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    id="mirror_to_aiko"
                                                    aria-checked={formData.mirror_to_aiko}
                                                    onClick={() => setFormData(prev => ({ ...prev, mirror_to_aiko: !prev.mirror_to_aiko }))}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${formData.mirror_to_aiko ? 'bg-blue-500' : 'bg-white/20'}`}
                                                >
                                                    <span className={`${formData.mirror_to_aiko ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Instagram — an action rather than a setting: it publishes
                                        right away, through Aiko, and can't be undone. */}
                                    {isSavedPhoto && (
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                            <div className="flex-1">
                                                <p className="text-white font-medium mb-1">Instagram</p>
                                                <p className="text-sm text-white/60">
                                                    {instagramMediaId
                                                        ? 'Posted to Instagram'
                                                        : !savedToAiko || !formData.mirror_to_aiko
                                                            ? 'Needs Post to Aiko on and saved first'
                                                            : 'Not on Instagram yet. Posts with this description and a link to the Aiko pin.'}
                                                </p>
                                                {instagramError && <p className="text-sm text-red-300 mt-1">{instagramError}</p>}
                                            </div>
                                            {!instagramMediaId && (
                                                <button
                                                    type="button"
                                                    onClick={handlePostToInstagram}
                                                    disabled={isPostingToInstagram || isLoading || !savedToAiko || !formData.mirror_to_aiko}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                >
                                                    {isPostingToInstagram ? 'Posting…' : 'Post to Instagram'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {editsInstagramDetails && (
                                        <InstagramDetailsFields
                                            value={instagramDetails}
                                            onChange={(patch) => setInstagramDetails(prev => ({ ...prev, ...patch }))}
                                        />
                                    )}

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
