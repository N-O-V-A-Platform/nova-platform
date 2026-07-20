const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  institution_id: string | null;
  status: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

export const authService = {
  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("nova_token", token);
    }
  },

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nova_token");
    }
    return null;
  },

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova_token");
    }
  },

  async getHeaders(): Promise<HeadersInit> {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async register(data: any): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Registration failed");
    }

    const resData: TokenResponse = await response.json();
    this.setToken(resData.access_token);
    return resData;
  },

  async login(data: any): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Login failed");
    }

    const resData: TokenResponse = await response.json();
    this.setToken(resData.access_token);
    return resData;
  },

  async googleAuth(credential: string): Promise<TokenResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Google login failed");
    }

    const resData: TokenResponse = await response.json();
    this.setToken(resData.access_token);
    return resData;
  },

  async getMe(): Promise<UserResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      this.clearToken();
      throw new Error("Session expired");
    }

    return response.json();
  },

  async getCourses(): Promise<any[]> {
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

  async enrollCourse(courseId: string): Promise<any> {
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

  async getPendingEscalations(): Promise<any[]> {
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

  async resolveEscalation(escalationId: string, responseText: string): Promise<any> {
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
  }
};
