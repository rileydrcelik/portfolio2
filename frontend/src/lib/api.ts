// API Client for backend communication

const PRODUCTION_API_HOST = 'portfolio2-production-0509.up.railway.app';
const PRODUCTION_HOSTS = new Set(['www.rileydrcelik.com', 'rileydrcelik.com']);

const rawApiValue =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000';

const normalizeHost = (value: string): string => {
  const trimmed = value.trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
  return withoutProtocol.replace(/\/+$/, '');
};

const resolveHost = (): string => {
  // Vercel production → always use Railway host
  if (process.env.VERCEL_ENV === 'production') {
    return PRODUCTION_API_HOST;
  }

  // Browser on your real domain → use Railway host
  if (typeof window !== 'undefined' && PRODUCTION_HOSTS.has(window.location.hostname)) {
    return PRODUCTION_API_HOST;
  }

  // Otherwise (local dev, preview, etc.) use env or localhost
  return normalizeHost(rawApiValue);
};

const buildUrl = (host: string): string => {
  // If we're talking to the real prod API, force https
  if (host === PRODUCTION_API_HOST) {
    return `https://${host}`;
  }

  // In the browser, mirror current protocol only for non-prod hosts
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://';
    return `${protocol}${host}`;
  }

  // On server, check for localhost
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`;
  }

  // On server, default to https
  return `https://${host}`;
};

const API_URL = buildUrl(resolveHost());
const POSTS_ENDPOINT = `${API_URL}/api/posts/`;
const ALBUMS_ENDPOINT = `${API_URL}/api/posts/albums/`;
const UPLOAD_IMAGE_ENDPOINT = `${API_URL}/api/upload/image`;
const CREATE_ALBUM_ENDPOINT = `${API_URL}/api/albums/create-by-category`;

export interface Post {
  id: string;
  slug: string;
  category: string;
  album: string;
  title: string;
  description?: string;
  post_type?: string;
  content_url: string;
  thumbnail_url: string;
  splash_image_url?: string | null;
  date: string;
  tags: string[];
  is_major: boolean;
  price?: number | null;
  gallery_urls?: string[];
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  is_favorite?: boolean;
}

export interface PostCreate {
  category: string;
  album: string;
  title: string;
  description?: string;
  content_url: string;
  thumbnail_url: string;
  splash_image_url?: string | null;
  date: string;
  tags?: string[];
  is_major?: boolean;
  slug?: string | null;
  article_content?: string | null;
  price?: number | null;
  gallery_urls?: string[];
  is_active?: boolean;
  is_favorite?: boolean;
  post_type?: string;
}

export async function getPosts(params?: {
  category?: string;
  album?: string;
  limit?: number;
  offset?: number;
  is_major?: boolean;
  is_favorite?: boolean;
  tag?: string;
}): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.album) queryParams.append('album', params.album);
  if (params?.tag) queryParams.append('tag', params.tag);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (typeof params?.is_major === 'boolean') queryParams.append('is_major', params.is_major ? 'true' : 'false');
  if (typeof params?.is_favorite === 'boolean') queryParams.append('is_favorite', params.is_favorite ? 'true' : 'false');

  const response = await fetch(`${POSTS_ENDPOINT}?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  return response.json();
}

export async function getPost(id: string): Promise<Post> {
  const response = await fetch(`${POSTS_ENDPOINT}${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }
  return response.json();
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const response = await fetch(`${POSTS_ENDPOINT}slug/${slug}`);
  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }
  return response.json();
}

export async function createPost(post: PostCreate, authToken?: string): Promise<Post> {
  console.log('[API] createPost called with:', post);
  console.log('[API] API_URL:', API_URL);
  console.log('[API] Posts endpoint:', POSTS_ENDPOINT);

  try {
    console.log('[API] Making fetch request...');
    const response = await fetch(POSTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(post),
    });

    console.log('[API] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('[API] Error response data:', errorData);
      } catch (e) {
        const text = await response.text();
        console.error('[API] Error response text:', text);
        errorData = { detail: text || 'Failed to create post' };
      }
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[API] Success! Post created:', data);
    return data;
  } catch (err) {
    console.error('[API] Fetch error:', err);
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${API_URL}. Is the backend server running?`);
    }
    throw err;
  }
}

export async function updatePost(id: string, post: Partial<PostCreate>, authToken?: string): Promise<Post> {
  const response = await fetch(`${POSTS_ENDPOINT}${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update post');
  }
  return response.json();
}

export async function deletePost(id: string, authToken?: string): Promise<void> {
  console.log('[API] deletePost called with id:', id);
  console.log('[API] Delete URL:', `${POSTS_ENDPOINT}${id}`);

  try {
    const response = await fetch(`${POSTS_ENDPOINT}${id}`, {
      method: 'DELETE',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });

    console.log('[API] Delete response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorMessage = '';
      try {
        const maybeJson = await response.json();
        if (maybeJson && typeof maybeJson.detail === 'string') {
          errorMessage = maybeJson.detail;
        }
      } catch (jsonErr) {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }

      if (!errorMessage) {
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'You are not authorized to delete posts with this account.';
        } else {
          errorMessage = `Failed to delete post (HTTP ${response.status})`;
        }
      }

      throw new Error(errorMessage);
    }

    console.log('[API] Post deleted successfully from database');
  } catch (err) {
    console.error('[API] Delete fetch error:', err);
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${API_URL}. Is the backend server running?`);
    }
    throw err instanceof Error ? err : new Error('Failed to delete post');
  }
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

export async function uploadImage(file: File, folder?: string, authToken?: string): Promise<UploadResponse> {
  console.log('[API] uploadImage called with:', { filename: file.name, size: file.size, type: file.type, folder });
  const uploadUrl = new URL(UPLOAD_IMAGE_ENDPOINT);
  if (folder) {
    uploadUrl.searchParams.set('folder', folder);
  }
  console.log('[API] Upload URL:', uploadUrl.toString());

  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('[API] Making upload request...');
    const response = await fetch(uploadUrl.toString(), {
      method: 'POST',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData,
    });

    console.log('[API] Upload response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorData;
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('[API] Upload error response text:', errorText);
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
            console.error('[API] Upload error response parsed:', errorData);
          } catch (parseErr) {
            errorData = { detail: errorText };
          }
        } else {
          errorData = { detail: 'Empty response from server' };
        }
      } catch (e) {
        console.error('[API] Error reading error response:', e);
        errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
      }
      const errorMessage = errorData?.detail || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[API] Upload failed with error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[API] Upload success!', data);
    return data;
  } catch (err) {
    console.error('[API] Upload fetch error:', err);
    throw err;
  }
}

export interface Album {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  order: string;
  is_active: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlbumRequest {
  category: string;
  name: string;
  description?: string;
}

export async function getAlbumsByCategory(category: string): Promise<string[]> {
  try {
    const response = await fetch(`${ALBUMS_ENDPOINT}${category}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Failed to fetch albums:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.albums || [];
  } catch (err) {
    console.error('[API] Error fetching albums:', err);
    return [];
  }
}

export async function createAlbum(album: CreateAlbumRequest, authToken?: string): Promise<Album> {
  const response = await fetch(CREATE_ALBUM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(album),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create album');
  }
  return response.json();
}
