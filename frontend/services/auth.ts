const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const BACKEND_UNAVAILABLE_MESSAGE =
  "Cannot reach the N.O.V.A. backend. Make sure the API is running on port 8000, then try again.";

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
  }
  return response.json() as Promise<T>;
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(BACKEND_UNAVAILABLE_MESSAGE);
  }
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  institution_id: string | null;
  status: string;
  is_email_verified?: boolean;
  is_onboarded?: boolean;
  reminders_enabled?: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_name?: "Student" | "Lecturer";
  institution_code?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PendingLecturer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  status: string;
}

export interface CertificateUploadResponse {
  badge_earned?: string;
  xp_awarded?: number;
  message?: string;
}

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    students: number;
    lecturers: number;
    pending_lecturers: number;
  };
  scraper: {
    is_running: boolean;
    sources: number;
    indexed_chunks: number;
    last_run: string | null;
  };
  integrations: Array<{ name: string; configured: boolean }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  category: string;
  link?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_index?: number | null;
  explanation?: string | null;
}

export interface QuizAttempt {
  id: string;
  score: number;
  answers: any[];
  submitted_at: string;
}

export interface QuizRecord {
  id: string;
  course_id: string;
  title: string;
  topic?: string | null;
  generated_by_ai: boolean;
  is_published: boolean;
  created_at: string;
  question_count: number;
  questions: QuizQuestion[];
  my_attempt?: QuizAttempt | null;
  attempt_count?: number | null;
  average_score?: number | null;
}

export interface StudentAnalyticsSummary {
  courses_enrolled?: number;
  questions_asked?: number;
  quizzes_taken?: number;
  average_quiz_score?: number | null;
  best_quiz_score?: number | null;
  attendance_checkins?: number;
  badges?: number;
  certificates?: number;
  weak_topics?: Array<{ topic: string; score: number }>;
  recent_scores?: Array<{ score: number; submitted_at: string }>;
}

export interface LecturerAnalyticsSummary {
  courses?: number;
  students?: number;
  questions_asked?: number;
  pending_escalations?: number;
  resources?: number;
  live_sessions?: number;
  average_quiz_score?: number | null;
  attendance_rate?: number | null;
  difficult_topics?: Array<{ topic: string; average_score: number }>;
  course_breakdown?: Array<any>;
}

export type ApiRecord = Record<string, any>;

export interface LeaderboardEntry {
  id?: string;
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  rank?: number | null;
  xp?: number | null;
  badges_count?: number | null;
}

export interface CourseResource {
  id: string;
  course_id?: string;
  file_name: string;
  file_type?: string;
  storage_url?: string;
}

export interface ChatConversation {
  id: string;
  course_id?: string;
  title?: string;
  questions?: Array<{
    id?: string;
    question: string;
    response?: string | null;
    confidence_score?: number | null;
  }>;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("detail" in payload)) {
      return fallback;
    }

    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const firstIssue = detail[0] as { msg?: unknown } | undefined;
      if (typeof firstIssue?.msg === "string") {
        return firstIssue.msg;
      }
    }
  } catch {
    // Use the safe fallback if an upstream proxy returned a non-JSON error.
  }

  return fallback;
}

export const authService = {
  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_token", token);
    }
  },

  setRefreshToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_refresh_token", token);
    }
  },

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nova_token");
    }
    return null;
  },

  getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nova_refresh_token");
    }
    return null;
  },

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova_token");
      localStorage.removeItem("nova_refresh_token");
    }
  },

  async getHeaders(): Promise<HeadersInit> {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resData = await parseResponse<TokenResponse>(response, "Registration failed");
    // Only store tokens if they are non-empty (email verification flow returns empty tokens)
    if (resData.access_token) {
      this.setToken(resData.access_token);
      this.setRefreshToken(resData.refresh_token);
    }
    return resData;
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resData = await parseResponse<TokenResponse>(response, "Login failed");
    this.setToken(resData.access_token);
    this.setRefreshToken(resData.refresh_token);
    return resData;
  },

  async googleAuth(idToken: string): Promise<TokenResponse> {
    const response = await apiFetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });

    const resData = await parseResponse<TokenResponse>(response, "Google login failed");
    this.setToken(resData.access_token);
    this.setRefreshToken(resData.refresh_token);
    return resData;
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Session refresh failed");
    }

    const resData: TokenResponse = await response.json();
    this.setToken(resData.access_token);
    this.setRefreshToken(resData.refresh_token);
    return resData;
  },

  async getMe(): Promise<UserResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          await this.refresh(refreshToken);
          const retryHeaders = await this.getHeaders();
          const retryResponse = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: retryHeaders,
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          }
        } catch {
          // Fall through to clearing the session.
        }
      }

      this.clearToken();
      throw new Error("Session expired");
    }

    return response.json();
  },

  async onboard(data: { role_name: "Student" | "Lecturer"; institution_code?: string | null }): Promise<TokenResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Onboarding failed");
    }

    const resData: TokenResponse = await response.json();
    this.setToken(resData.access_token);
    this.setRefreshToken(resData.refresh_token);
    return resData;
  },

  async verifyEmail(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Email verification failed");
    }

    const resData = await response.json();
    if (resData.access_token) {
      this.setToken(resData.access_token);
      if (resData.refresh_token) {
        this.setRefreshToken(resData.refresh_token);
      }
    }
    return resData;
  },

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Forgot password request failed");
    }

    return response.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Password reset failed");
    }

    return response.json();
  },

  async getCourses(): Promise<ApiRecord[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/courses/`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }

    return response.json();
  },

  async getEnrolledCourses(): Promise<ApiRecord[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/courses/enrolled`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch enrolled courses");
    }

    return response.json();
  },

  async getStudyTip(): Promise<{ tip: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/courses/study-tip`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch study tip");
    }

    return response.json();
  },

  async enrollCourse(courseId: string): Promise<unknown> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/courses/enroll?course_id_in=${courseId}`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Enrollment failed");
    }

    return response.json();
  },

  async getPendingEscalations(): Promise<ApiRecord[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/escalations/pending`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch pending escalations");
    }

    return response.json();
  },

  async resolveEscalation(
    escalationId: string,
    responseText: string,
  ): Promise<unknown> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/escalations/${escalationId}/resolve?response_text=${encodeURIComponent(responseText)}`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to resolve escalation");
    }

    return response.json();
  },

  async getAnnouncements(): Promise<string[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/courses/announcements`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch announcements");
    }

    return response.json();
  },

  async setPassword(password: string): Promise<{ message: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/users/set-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to update password");
    }

    return response.json();
  },

  async requestLecturerRole(): Promise<UserResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/users/request-lecturer-role`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to request lecturer approval");
    }

    return response.json();
  },

  async getPendingLecturers(): Promise<PendingLecturer[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/pending-lecturers`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to load lecturer requests");
    }

    return response.json();
  },

  async getAdminOverview(): Promise<AdminOverview> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/overview`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, "Failed to load admin overview"));
    }

    return response.json();
  },

  async approveLecturer(userId: string): Promise<{ message: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/approve-lecturer/${userId}`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to approve lecturer");
    }

    return response.json();
  },

  async rejectLecturer(userId: string): Promise<{ message: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/reject-lecturer/${userId}`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to reject lecturer");
    }

    return response.json();
  },

  async getUiPathCourses(): Promise<ApiRecord[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/courses`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch UiPath courses");
    }

    return response.json();
  },

  async getUiPathJourney(): Promise<ApiRecord> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/journey`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch study journey recommendations");
    }

    return response.json();
  },

  async getUiPathRecommendations(interests?: string): Promise<ApiRecord[]> {
    const headers = await this.getHeaders();
    const query = interests ? `?interests=${encodeURIComponent(interests)}` : "";
    const response = await fetch(`${API_BASE_URL}/uipath/recommendations${query}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch UiPath recommendations");
    }

    return response.json();
  },

  async uploadUiPathCertificate(
    courseId: string,
    issueDate: string,
    verificationUrl: string,
    verificationId?: string,
  ): Promise<CertificateUploadResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/upload-certificate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        course_id: courseId,
        issue_date: issueDate,
        verification_url: verificationUrl,
        verification_id: verificationId || null,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to upload certificate");
    }

    return response.json();
  },

  async createConversation(courseId: string, title?: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ course_id: courseId, title }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to create conversation");
    }

    return response.json();
  },

  async getConversations(): Promise<any[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return response.json();
  },

  async getConversation(conversationId: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversation details");
    }

    return response.json();
  },

  async askQuestion(conversationId: string, question: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/chats/${conversationId}/questions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to submit question");
    }

    return response.json();
  },

  async getCourseResources(courseId: string): Promise<any[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/resources/course/${courseId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch course resources");
    }

    return response.json();
  },

  async toggleReminders(): Promise<{ reminders_enabled: boolean }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/users/toggle-reminders`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to update reminder preferences");
    }

    return response.json();
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/users/leaderboard`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch leaderboard");
    }

    return response.json();
  },

  async getScrapeStatus(): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/scrape-status`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch scraper status");
    }

    return response.json();
  },

  async getScrapedSources(): Promise<any[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/sources`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch scraped sources");
    }

    return response.json();
  },

  async triggerScrape(): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/trigger-scrape`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to trigger scraper");
    }

    return response.json();
  },

  async scrapeSingleUrl(url: string, title?: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/uipath/scrape-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, title }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Failed to scrape URL");
    }

    return response.json();
  },

  async getNotifications(unreadOnly = false): Promise<NotificationItem[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/?unread_only=${String(unreadOnly)}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    return response.json();
  },

  async markNotificationRead(notificationId: string): Promise<NotificationItem> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to mark notification as read");
    }

    return response.json();
  },

  async getStudentAnalytics(): Promise<StudentAnalyticsSummary> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/analytics/student`, { method: "GET", headers });
    if (!response.ok) {
      throw new Error("Failed to fetch student analytics");
    }
    return response.json();
  },

  async getLecturerAnalytics(): Promise<LecturerAnalyticsSummary> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/analytics/lecturer`, { method: "GET", headers });
    if (!response.ok) {
      throw new Error("Failed to fetch lecturer analytics");
    }
    return response.json();
  },

  async getQuizzes(courseId?: string): Promise<QuizRecord[]> {
    const headers = await this.getHeaders();
    const url = new URL(`${API_BASE_URL}/quizzes/`);
    if (courseId) url.searchParams.set("course_id", courseId);
    const response = await fetch(url.toString(), { method: "GET", headers });
    if (!response.ok) {
      throw new Error("Failed to fetch quizzes");
    }
    return response.json();
  },

  async submitQuizAttempt(quizId: string, answers: Record<string, number>): Promise<QuizRecord> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to submit quiz");
    }

    return response.json();
  }
};

