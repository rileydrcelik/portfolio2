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
  const response = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create post');
  }
  return response.json();
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
  const response = await fetch(`${API_URL}/api/posts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete post');
  }
}

