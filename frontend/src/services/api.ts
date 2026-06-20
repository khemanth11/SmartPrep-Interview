import { GeorgianLari } from "lucide-react";

export interface User {
    id: string;
    username: string;
    email: string;
}
export interface AuthResponse {
    token: string;
    username: string;
}
export interface ChatMessage {
    sender: 'USER' | 'AI';
    message: string;
    sentAt?: string;
}
export interface InterviewSession {
    id: string;
    userId: string;
    problemId?: string;
    role: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    communicationScore?: number;
    domainKnowledgeScore?: number;
    feedback?: string;
    messages: ChatMessage[];
    createdAt: string;
}
export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    tags: string[];
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
}

const BASE_URL = '/api/v1';


// Contructnig headers with JWT token
const getHeaders = (token: string | null) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

//api helper functions
export async function login(request: Record<string, string>): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(null),
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
    }
    return res.json()
}

export async function register(request: Record<string, string>): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(null),
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
    }
    return res.json();
}

export async function getProblems(token: string): Promise<Problem[]> {
    const res = await fetch(`${BASE_URL}/problems`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load problems');
    return res.json();
}


export async function getProblemById(id: string, token: string): Promise<Problem> {
    const res = await fetch(`${BASE_URL}/problems/${id}`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load problem');
    return res.json();
}

export async function createInterviewSession(role: string, problemId: string | null, token: string): Promise<InterviewSession> {
    const res = await fetch(`${BASE_URL}/interviews`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ role, problemId }),
    });
    if (!res.ok) throw new Error('Failed to start interview session');
    return res.json();
}

export async function getSessionHistory(token: string): Promise<InterviewSession[]> {
    const res = await fetch(`${BASE_URL}/interviews`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load interview history');
    return res.json();
}

export async function getSessionById(id: string, token: string): Promise<InterviewSession> {
    const res = await fetch(`${BASE_URL}/interviews/${id}`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load session details');
    return res.json();
}

export async function endInterviewSession(id: string, token: string): Promise<InterviewSession> {
    const res = await fetch(`${BASE_URL}/interviews/${id}/end`, {
        method: 'POST',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to evaluate and end interview');
    return res.json();
}

// asynch streaming client for reading real time SEE chat tokens
// uses the browser readablestrea, reader to read the streamed charecters
export async function streamChatMessage(
    sessionId: string,
    message: string,
    token: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (err: any) => void
): Promise<void> {
    try {
        const res = await fetch(`${BASE_URL}/interviews/${sessionId}/chat/stream`, {
            method: 'POST',
            headers: getHeaders(token),
            body: JSON.stringify({ message }),
        });
        if (!res.ok) {
            throw new Error('Failed to send streaming message');
        }
        if (!res.body) {
            throw new Error('No response body stream found');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last partial line in the buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                // Strip carriage returns (\r) from the end of the line
                const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;
                if (cleanLine.trim().startsWith('data:')) {
                    const tokenData = cleanLine.substring(cleanLine.indexOf('data:') + 5);
                    onToken(tokenData);
                }
            }
        }

        // Process any remaining content in the buffer
        const cleanBuffer = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
        if (cleanBuffer.trim().startsWith('data:')) {
            const tokenData = cleanBuffer.substring(cleanBuffer.indexOf('data:') + 5);
            onToken(tokenData);
        }
        onComplete();

    } catch (error) {
        onError(error);
    }
}