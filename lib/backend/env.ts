import type { Database, MediaStorage } from './local/database';

export interface Bindings {
  DB: Database;
  MEDIA: MediaStorage;
  checkpoint: () => Promise<void>;
  signal?: AbortSignal;
}

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
}

export interface AuthSession {
  user: LocalUser;
  token: string;
}

export type AppId =
  'ai-chat' | 'e-commerce' | 'finance' | 'language-learning' | 'social-media';

export interface Membership {
  appId: AppId;
  createdAt: string;
  role: 'admin' | 'member';
  userId: string;
}

export interface WorkerContext {
  Bindings: Bindings;
  Variables: {
    membership: Membership;
    session: AuthSession | null;
  };
}
