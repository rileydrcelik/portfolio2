// Database Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
  description: string;
  coverImage?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItem {
  id: string;
  albumId: string;
  title: string;
  slug: string;
  description: string;
  content: string; // MDX content
  mediaType: 'image' | 'video' | 'audio';
  mediaUrl: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  order: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  sizes?: string[];
  colors?: string[];
  inventory: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId?: string;
  email: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  billingAddress: Address;
  stripePaymentIntentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Component Props Types
export interface PageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export interface SubjectPageProps extends PageProps {
  subject: Subject;
  albums: Album[];
}

export interface AlbumPageProps extends PageProps {
  album: Album;
  contentItems: ContentItem[];
}

export interface ContentItemPageProps extends PageProps {
  contentItem: ContentItem;
  relatedItems: ContentItem[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Types
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface NewsletterFormData {
  email: string;
}
