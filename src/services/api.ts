import { StudyNote, Faculty, Level } from '../types.ts';

const ADMIN_TOKEN_KEY = 'bub_admin_token';

export function getStoredAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem('uniben_admin_token');
}

export function setStoredAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function removeStoredAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export const api = {
  // Public Student Endpoints
  async getPublishedNotes(params?: { level?: string; faculty?: string; q?: string }): Promise<StudyNote[]> {
    const url = new URL('/api/notes', window.location.origin);
    if (params?.level) url.searchParams.set('level', params.level);
    if (params?.faculty) url.searchParams.set('faculty', params.faculty);
    if (params?.q) url.searchParams.set('q', params.q);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error('Failed to load published study notes');
    }
    const data = await res.json();
    return data.notes || [];
  },

  async getNoteById(id: string): Promise<StudyNote> {
    const token = getStoredAdminToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/notes/${id}`, { headers });
    if (!res.ok) {
      throw new Error('Study note not found');
    }
    const data = await res.json();
    return data.note;
  },

  getPdfUrl(id: string): string {
    const token = getStoredAdminToken();
    if (token) {
      return `/api/notes/${id}/pdf?token=${encodeURIComponent(token)}`;
    }
    return `/api/notes/${id}/pdf`;
  },

  getDownloadUrl(id: string): string {
    return `/api/notes/${id}/download`;
  },

  async requestOcrText(id: string): Promise<string> {
    const res = await fetch(`/api/notes/${id}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'OCR extraction failed');
    }
    const data = await res.json();
    return data.text || '';
  },

  // Admin Endpoints
  async adminLogin(password: string): Promise<string> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    setStoredAdminToken(data.token);
    return data.token;
  },

  async checkAdminSession(): Promise<boolean> {
    const token = getStoredAdminToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/admin/check-session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.authenticated;
    } catch {
      return false;
    }
  },

  async changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }
  },

  async resetAdminPassword(recoveryCode?: string): Promise<string> {
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
    return data.message || 'Password reset successful';
  },

  async getAdminNotes(): Promise<{
    notes: StudyNote[];
    totalNotes: number;
    publishedCount: number;
    unpublishedCount: number;
  }> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch('/api/admin/notes', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve notes for dashboard');
    }
    return res.json();
  },

  async uploadNote(formData: FormData): Promise<StudyNote> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch('/api/admin/notes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.note;
  },

  async updateNote(
    id: string,
    payload: {
      courseTitle: string;
      topic: string;
      lecturer: string;
      level: Level;
      faculty: Faculty;
      isPublished?: boolean;
    }
  ): Promise<StudyNote> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch(`/api/admin/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Update failed');
    }
    return data.note;
  },

  async togglePublish(id: string, publish?: boolean): Promise<StudyNote> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch(`/api/admin/notes/${id}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publish }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Publish toggle failed');
    }
    return data.note;
  },

  async deleteNote(id: string): Promise<void> {
    const token = getStoredAdminToken();
    if (!token) throw new Error('Admin authorization required');

    const res = await fetch(`/api/admin/notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Delete failed');
    }
  },
};
