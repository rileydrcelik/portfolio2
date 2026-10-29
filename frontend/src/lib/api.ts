// API Client for backend communication

const PRODUCTION_API_HOST = 'api.rileydrcelik.com';
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
  // Vercel production → always use the production API
  if (process.env.VERCEL_ENV === 'production') {
    return PRODUCTION_API_HOST;
  }

  // Browser on your real domain → use the production API
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

/**
 * Turn a FastAPI error body into something a person can read.
 *
 * `detail` is a plain string for errors we raise ourselves, but an *array* of
 * `{loc, msg}` objects for request-validation failures (422). Interpolating
 * that array straight into a message renders "[object Object]", which is how a
 * perfectly diagnosable "note_id: Field required" reached the UI as an opaque
 * failure. Arrays are flattened to "field: message" instead.
 */
function apiErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((entry) => {
        const e = entry as { loc?: unknown[]; msg?: string };
        // Drop the leading "body"/"query" segment; the field name is the useful part.
        const field = Array.isArray(e.loc) ? e.loc.slice(1).join('.') || String(e.loc[0] ?? '') : '';
        return field ? `${field}: ${e.msg ?? 'invalid'}` : (e.msg ?? '');
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  return fallback;
}

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
  is_major: boolean;
  price?: number | null;
  gallery_urls?: string[];
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  is_favorite?: boolean;
  cross_post_albums?: string[];
  printify_product_id?: string | null;
  listing_type?: 'printify' | 'meetup' | null;
  stock?: number | null;
  accepts_offers?: boolean;
  fb_marketplace_url?: string | null;
  /** Instagram's id for this post once published there; null if it never was. */
  instagram_media_id?: string | null;
  /** Mirrored to Aiko (art/photo). Off means the admin opted this post out. */
  mirror_to_aiko?: boolean;
  instagram_hashtags?: string[];
}

/** What an Instagram post carries besides its caption. Read only at publish. */
export interface InstagramDetails {
  /** Bare, without the '#'. */
  instagram_hashtags: string[];
}

export interface PostCreate extends Partial<InstagramDetails> {
  category: string;
  album: string;
  title: string;
  description?: string;
  content_url: string;
  thumbnail_url: string;
  splash_image_url?: string | null;
  date: string;
  is_major?: boolean;
  slug?: string | null;
  article_content?: string | null;
  price?: number | null;
  gallery_urls?: string[];
  is_active?: boolean;
  is_favorite?: boolean;
  post_type?: string;
  cross_post_albums?: string[];
  printify_product_id?: string | null;
  listing_type?: 'printify' | 'meetup' | null;
  stock?: number | null;
  accepts_offers?: boolean;
  fb_marketplace_url?: string | null;
  /**
   * Publish this photo post to Instagram (defaults to on). Create-only and absent from
   * the edit form on purpose: Instagram has no API to delete a post or change
   * its caption afterwards, so it is a one-time, irreversible choice.
   */
  post_to_instagram?: boolean;
  /** Mirror this art/photo post to Aiko. Defaults to on; Instagram needs it. */
  mirror_to_aiko?: boolean;
}

export async function getPosts(params?: {
  category?: string;
  album?: string;
  limit?: number;
  offset?: number;
  is_major?: boolean;
  is_favorite?: boolean;
  sort_by?: string;
  pin_now_playing?: boolean;
}): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.album) queryParams.append('album', params.album);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (typeof params?.is_major === 'boolean') queryParams.append('is_major', params.is_major ? 'true' : 'false');
  if (typeof params?.is_favorite === 'boolean') queryParams.append('is_favorite', params.is_favorite ? 'true' : 'false');
  if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params?.pin_now_playing) queryParams.append('pin_now_playing', 'true');

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
    throw new Error(apiErrorMessage(error, 'Failed to update post'));
  }
  return response.json();
}

/**
 * Post an already-published photo to Instagram (through Aiko). Waits for the
 * publish to finish and returns the post with its instagram_media_id set.
 */
export async function publishPostToInstagram(id: string, authToken?: string): Promise<Post> {
  const response = await fetch(`${POSTS_ENDPOINT}${id}/instagram`, {
    method: 'POST',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiErrorMessage(error, 'Failed to post to Instagram'));
  }
  return response.json();
}

/** Locations already used on posts, most used first. */
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
    throw new Error(apiErrorMessage(error, 'Failed to create album'));
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Embedded notes (w_notes)
// ---------------------------------------------------------------------------

/** One row in the admin's note picker. */
export interface AvailableNote {
  id: string;
  title: string;
  /** Plain-text preview, so the list renders without parsing rich-text HTML. */
  excerpt: string;
  folder?: string | null;
  updated_at: number;
}

/**
 * Notes available to embed. Proxied by our backend, which holds the w_notes
 * credential — the browser never sees it.
 */
export async function getAvailableNotes(authToken?: string): Promise<AvailableNote[]> {
  const response = await fetch(`${API_URL}/api/notes/available`, {
    headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiErrorMessage(error, 'Could not load notes'));
  }
  return response.json();
}

/** Place a note as a post inside the chosen subject. */
export async function embedNote(
  // album is optional: the server falls back to the note's own folder name, so
  // embedding asks for nothing but the subject and which note.
  payload: { note_id: string; category: string; album?: string; is_major?: boolean },
  authToken?: string,
): Promise<Post> {
  const response = await fetch(`${API_URL}/api/notes/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiErrorMessage(error, 'Failed to embed note'));
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Now playing (mariposa)
// ---------------------------------------------------------------------------

/** One song as the now-playing card draws it. */
export interface PresenceSong {
  title: string;
  artists: string[];
  album: string | null;
  artwork_url: string | null;
  /** Two CSS colours, drawn when there is no cover. */
  gradient: [string, string] | null;
}

export interface NowPlayingState {
  /** `idle` covers everything past: stopped, long paused, or never heard from. */
  state: 'playing' | 'paused' | 'idle' | 'hidden';
  track: (PresenceSong & { duration_s: number | null }) | null;
  /** Where the song was at `position_at`; the card runs the clock on from there. */
  position_s: number;
  position_at: string | null;
  /** When the song was last heard; null while playing. */
  last_active_at: string | null;
  server_now: string;
  recent: (PresenceSong & { played_at: string })[];
  /** The phone is streaming its audio: the card offers Listen. */
  live?: boolean;
}

/** The phone's live audio, as an HLS playlist; see lib/live-listen.ts. */
export function liveStreamUrl(): string {
  return `${API_URL}/api/live/live.m3u8`;
}

/**
 * The current now-playing state. Pass the last ETag to get `null` back when
 * nothing changed (a 304), which is what most polls come back as.
 */
export async function getNowPlaying(
  etag?: string | null,
): Promise<{ data: NowPlayingState; etag: string | null } | null> {
  const response = await fetch(`${API_URL}/api/presence/now-playing`, {
    headers: etag ? { 'If-None-Match': etag } : {},
    cache: 'no-store',
  });
  if (response.status === 304) return null;
  if (!response.ok) throw new Error(`Now playing: ${response.status}`);
  return { data: await response.json(), etag: response.headers.get('ETag') };
}

/** Place the now-playing card in a subject. Once per subject. */
export async function embedNowPlaying(
  payload: { category: string; album?: string; is_major?: boolean },
  authToken?: string,
): Promise<Post> {
  const response = await fetch(`${API_URL}/api/presence/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiErrorMessage(error, 'Failed to place the now-playing card'));
  }
  return response.json();
}

// --- Shop ---------------------------------------------------------------------
// Printify holds the catalog (sizes, colors, prices); Stripe takes the payment.
// All money here is integer cents.

export interface ShopOptionValue {
  id: number;
  title: string;
  colors: string[];
}

export interface ShopOption {
  name: string;
  type?: string | null;
  values: ShopOptionValue[];
}

export interface ShopVariant {
  id: number;
  title: string;
  price_cents: number;
  /** One option value id per option, e.g. [color id, size id]. */
  options: number[];
  /** Admin only: what Printify charges the shop to make it. */
  cost_cents?: number | null;
  is_enabled?: boolean;
  is_available?: boolean;
}

/** A Printify product as the shop shows it. */
export interface ShopListing {
  type?: 'printify';
  product_id: string;
  title: string;
  options: ShopOption[];
  variants: ShopVariant[];
  /** Printify's quote for shipping one item to the ship-to country; null if unavailable. */
  shipping_cents: number | null;
  images: { src: string; variant_ids: number[] }[];
  ships_to?: string[];
}

/** A meetup item: sold in person, paid online or in cash. */
export interface MeetupListing {
  type: 'meetup';
  title: string;
  price_cents: number | null;
  /** Stock left, less what open checkouts are holding. */
  available: number;
  accepts_offers: boolean;
  fb_marketplace_url: string | null;
  max_quantity: number;
}

export interface PrintifyProductSummary {
  id: string;
  title: string;
  image: string | null;
  min_price_cents: number | null;
}

export interface ShopOrderStatus {
  status: 'pending' | 'paid' | 'submitted' | 'failed' | 'expired';
  title: string | null;
  variant_title: string | null;
  quantity: number;
  amount_total_cents: number | null;
  currency: string;
  fulfillment?: 'printify' | 'meetup';
}

export function formatCents(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

async function shopRequest<T>(path: string, init: RequestInit & { authToken?: string } = {}, fallback = 'Shop request failed'): Promise<T> {
  const { authToken, headers, ...rest } = init;
  const response = await fetch(`${API_URL}/api/shop${path}`, {
    ...rest,
    cache: 'no-store',
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(apiErrorMessage(error, fallback));
  }
  return response.json();
}

/** What a shop post sells, or null if it isn't set up for sale. */
export async function getShopListing(postId: string): Promise<ShopListing | MeetupListing | null> {
  try {
    return await shopRequest<ShopListing | MeetupListing>(`/listing/${postId}`);
  } catch (err) {
    if (err instanceof Error && /not found/i.test(err.message)) return null;
    throw err;
  }
}

/** Start Stripe Checkout; resolves to the hosted checkout URL to redirect to. */
export async function startCheckout(postId: string, variantId: number | null, quantity = 1): Promise<string> {
  const { url } = await shopRequest<{ url: string }>('/checkout', {
    method: 'POST',
    body: JSON.stringify({ post_id: postId, variant_id: variantId, quantity }),
  }, 'Could not start checkout');
  return url;
}

export async function getCheckoutStatus(sessionId: string): Promise<ShopOrderStatus> {
  return shopRequest<ShopOrderStatus>(`/checkout/${encodeURIComponent(sessionId)}`);
}

export async function listPrintifyProducts(authToken?: string): Promise<PrintifyProductSummary[]> {
  const body = await shopRequest<{ products: PrintifyProductSummary[] }>('/admin/printify-products', { authToken }, 'Could not load Printify products');
  return body.products;
}

export async function getPrintifyProduct(productId: string, authToken?: string): Promise<ShopListing> {
  return shopRequest<ShopListing>(`/admin/products/${productId}`, { authToken }, 'Could not load the Printify product');
}

/** Write variant prices / enabled flags through to Printify. */
export async function updatePrintifyVariants(
  productId: string,
  variants: { id: number; price_cents?: number; is_enabled?: boolean }[],
  authToken?: string,
): Promise<ShopListing> {
  return shopRequest<ShopListing>(`/admin/products/${productId}/variants`, {
    method: 'PUT',
    body: JSON.stringify({ variants }),
    authToken,
  }, 'Could not save prices to Printify');
}

// --- Meetup items: requests, offers, settling up --------------------------------

export interface OfferSubmission {
  post_id: string;
  quantity: number;
  /** Required when the item takes offers; omitted otherwise (listed price). */
  offer_cents?: number;
  name?: string;
  email: string;
  phone?: string;
  message?: string;
  /** Honeypot; always empty from a real visitor. */
  website?: string;
}

export async function submitOffer(offer: OfferSubmission): Promise<void> {
  await shopRequest('/offers', { method: 'POST', body: JSON.stringify(offer) }, 'Could not send your request');
}

export interface ShopOfferRow {
  id: string;
  created_at: string | null;
  status: 'new' | 'accepted' | 'declined' | 'paid';
  post_id: string | null;
  title: string | null;
  listed_price_cents: number | null;
  available: number;
  quantity: number;
  offer_cents: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  pay_link_expires_at: string | null;
}

export interface ShopOrderRow {
  id: string;
  created_at: string | null;
  status: string;
  livemode: boolean;
  fulfillment: 'printify' | 'meetup';
  payment_method: 'stripe' | 'cash';
  title: string | null;
  email: string | null;
  phone: string | null;
  variant_title: string | null;
  quantity: number;
  amount_total_cents: number | null;
  printify_order_id: string | null;
  printify_status: string | null;
  tracking_url: string | null;
  error: string | null;
}

export async function listShopOffers(authToken: string, includeClosed = false): Promise<ShopOfferRow[]> {
  return shopRequest<ShopOfferRow[]>(`/admin/offers${includeClosed ? '?include_closed=true' : ''}`, { authToken }, 'Could not load requests');
}

export async function createOfferPayLink(offerId: string, authToken: string): Promise<{ url: string; amount_cents: number }> {
  return shopRequest(`/admin/offers/${offerId}/pay-link`, { method: 'POST', authToken }, 'Could not make a pay link');
}

export async function markOfferPaidCash(offerId: string, authToken: string): Promise<void> {
  await shopRequest(`/admin/offers/${offerId}/paid-cash`, { method: 'POST', authToken }, 'Could not record the cash sale');
}

export async function declineOffer(offerId: string, authToken: string): Promise<void> {
  await shopRequest(`/admin/offers/${offerId}/decline`, { method: 'POST', authToken }, 'Could not decline the request');
}

export async function listShopOrders(authToken: string): Promise<ShopOrderRow[]> {
  return shopRequest<ShopOrderRow[]>('/admin/orders', { authToken }, 'Could not load orders');
}

export async function completeShopOrder(orderId: string, authToken: string): Promise<void> {
  await shopRequest(`/admin/orders/${orderId}/complete`, { method: 'POST', authToken }, 'Could not update the order');
}
