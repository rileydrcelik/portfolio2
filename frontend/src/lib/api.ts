// API Client for backend communication

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Post {
  id: string;
  category: string;
  album: string;
  title: string;
  description: string;
  content_url: string;
  thumbnail_url: string;
  date: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  category: string;
  album: string;
  title: string;
  description: string;
  content_url: string;
  thumbnail_url: string;
  date: string;
  tags?: string[];
}

export async function getPosts(params?: {
  category?: string;
  album?: string;
  limit?: number;
  offset?: number;
}): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.album) queryParams.append('album', params.album);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_URL}/api/posts?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  return response.json();
}

export async function getPost(id: string): Promise<Post> {
  const response = await fetch(`${API_URL}/api/posts/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }
  return response.json();
}

export async function createPost(post: PostCreate): Promise<Post> {
  console.log('[API] createPost called with:', post);
  console.log('[API] API_URL:', API_URL);
  console.log('[API] Full URL:', `${API_URL}/api/posts`);
  
  try {
    console.log('[API] Making fetch request...');
    const response = await fetch(`${API_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

export async function updatePost(id: string, post: Partial<PostCreate>): Promise<Post> {
  const response = await fetch(`${API_URL}/api/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update post');
  }
  return response.json();
}

export async function deletePost(id: string): Promise<void> {
  console.log('[API] deletePost called with id:', id);
  console.log('[API] Delete URL:', `${API_URL}/api/posts/${id}`);
  
  try {
    const response = await fetch(`${API_URL}/api/posts/${id}`, {
      method: 'DELETE',
    });
    
    console.log('[API] Delete response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('[API] Delete error response:', errorData);
      } catch (e) {
        const text = await response.text();
        console.error('[API] Delete error text:', text);
        errorData = { detail: text || 'Failed to delete post' };
      }
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('[API] Post deleted successfully from database');
  } catch (err) {
    console.error('[API] Delete fetch error:', err);
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${API_URL}. Is the backend server running?`);
    }
    throw err;
  }
}

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  console.log('[API] uploadImage called with:', { filename: file.name, size: file.size, type: file.type });
  console.log('[API] Upload URL:', `${API_URL}/api/upload/image`);
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    console.log('[API] Making upload request...');
    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData,
    });
    
    console.log('[API] Upload response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('[API] Upload error response:', errorData);
      } catch (e) {
        const text = await response.text();
        console.error('[API] Upload error text:', text);
        errorData = { detail: text || 'Failed to upload image' };
      }
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API] Upload success!', data);
    return data;
  } catch (err) {
    console.error('[API] Upload fetch error:', err);
    throw err;
  }
}
