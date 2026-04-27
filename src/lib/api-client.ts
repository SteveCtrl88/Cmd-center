/**
 * Tiny fetch wrapper for the Planning UI. Uses native fetch + JSON,
 * plus a normalized error path that React Query callers can rely on.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;

  if (init?.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }

  const res = await fetch(path, { ...init, headers, body });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ProjectListItem {
  _id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  tags: string[];
  noteCount: number;
  driveRefs: unknown[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealTask {
  id: string;
  title: string;
  description: string;
  /** TODO | IN_PROGRESS | COMPLETE | CANCELLED */
  status: string;
  dueAt?: string;
  completedAt?: string;
  httpLink: string;
}

export interface DealItem {
  _id: string;
  userId: string;
  lightfieldId: string;
  name: string;
  accountName: string;
  stage: string;
  amount: number | string | null;
  nextSteps: string;
  owner: string;
  description: string;
  httpLink: string;
  followUps: { _id?: string; task: string; assignee: string; dueDate?: string }[];
  tasks: DealTask[];
  rawFields: Record<string, { value: unknown; valueType?: string }>;
  lightfieldCreatedAt?: string;
  lightfieldUpdatedAt?: string;
  aiSummary: string;
  aiSummaryAt?: string;
  cachedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealsResponse {
  deals: DealItem[];
  lastCachedAt: string | null;
  count: number;
}

export interface NoteAttachment {
  _id?: string;
  publicId: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
  addedAt?: string;
}

export interface NoteItem {
  _id: string;
  projectId: string;
  userId: string;
  title: string;
  /** HTML body emitted by the rich-text editor. May contain <img> tags. */
  body: string;
  tags: string[];
  links: {
    _id?: string;
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    siteName: string;
    addedAt?: string;
  }[];
  images: unknown[];
  attachments: NoteAttachment[];
  driveRefs: unknown[];
  aiSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  siteName: string;
  partial?: boolean;
}
