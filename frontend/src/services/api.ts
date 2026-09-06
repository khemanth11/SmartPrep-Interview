// import { GeorgianLari } from "lucide-react";

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

export interface TestCase {
    input: string;
    output: string;
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
    systemTemplate?: string;
    jsTemplate?: string;
    javaTemplate?: string;
    cppTemplate?: string;
    goTemplate?: string;
    sampleTestCases?: TestCase[];
    solveStatus?: 'SOLVED' | 'ATTEMPTED' | 'UNSOLVED';
    category?: string;
    moduleOrder?: number;
    isCompleted?: boolean;
}

export interface Submission {
    id: string;
    problemId: string;
    code: string;
    language: string;
    status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';
    passedCount: number;
    totalCount: number;
    submittedAt: string;
}


export interface TestCaseExecutionResult {
    testCaseIndex: number;
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    error?: string;
    elapsedTimeMs: number;
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

export async function createInterviewSession(role: string, problemId: string | null, token: string, resumeText?: string | null): Promise<InterviewSession> {
    const res = await fetch(`${BASE_URL}/interviews`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ role, problemId, resumeText }),
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

export async function parseResume(file: File, token: string): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}/interviews/parse-resume`, {
        method: 'POST',
        headers,
        body: formData,
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to parse resume');
    }
    return res.json();
}

export async function runCode(
    id: string,
    code: string,
    language: string,
    token: string
): Promise<TestCaseExecutionResult[]> {
    const res = await fetch(`${BASE_URL}/problems/${id}/run`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ code, language }),
    });
    if (!res.ok) throw new Error('Failed to run code');
    return res.json();
}

export async function submitCode(
    id: string,
    code: string,
    language: string,
    token: string
): Promise<TestCaseExecutionResult[]> {
    const res = await fetch(`${BASE_URL}/problems/${id}/submit`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ code, language }),
    });
    if (!res.ok) throw new Error('Failed to submit code');
    return res.json();
}

export async function getLatestSubmission(
    id: string,
    token: string
): Promise<Submission | null> {
    const res = await fetch(`${BASE_URL}/problems/${id}/submissions/latest`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error('Failed to load latest submission');
    return res.json();
}

export async function getSubmissionHistory(
    id: string,
    token: string
): Promise<Submission[]> {
    const res = await fetch(`${BASE_URL}/problems/${id}/submissions`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to load submission history');
    return res.json();
}

export async function toggleProblemComplete(
    id: string,
    token: string
): Promise<{ problemId: string; isCompleted: boolean }> {
    const res = await fetch(`${BASE_URL}/problems/${id}/toggle-complete`, {
        method: 'POST',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to toggle completion status');
    return res.json();
}

export interface RankedProblem {
    priorityRank: number;
    problemId: string;
    title: string;
    difficulty: string;
    category: string;
    reason: string;
    completed: boolean;
}

export interface CompanyPrepPlan {
    id: string;
    userId: string;
    companyName: string;
    role: string;
    examDate?: string;
    jobDescription?: string;
    aiStrategySummary?: string;
    prioritizedProblems: RankedProblem[];
    createdAt: string;
}

export interface UserAnalyticsResponse {
    totalProblemsSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    totalSubmissions: number;
    averageCommunicationScore: number;
    averageDomainKnowledgeScore: number;
    completedInterviewsCount: number;
    googleReadinessScore: number;
    amazonReadinessScore: number;
    microsoftReadinessScore: number;
}

export async function generateCompanyPrepPlan(
    request: { companyName: string; role: string; examDate?: string; jobDescription?: string },
    token: string
): Promise<CompanyPrepPlan> {
    const res = await fetch(`${BASE_URL}/company-prep/generate`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(request)
    });
    if (!res.ok) throw new Error('Failed to generate organization preparation plan');
    return res.json();
}

export async function getActiveCompanyPrepPlan(token: string): Promise<CompanyPrepPlan | null> {
    const res = await fetch(`${BASE_URL}/company-prep/active`, {
        method: 'GET',
        headers: getHeaders(token)
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error('Failed to fetch active organization prep plan');
    return res.json();
}

export async function getUserAnalytics(token: string): Promise<UserAnalyticsResponse> {
    const res = await fetch(`${BASE_URL}/analytics/dashboard`, {
        method: 'GET',
        headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to load candidate analytics');
    return res.json();
}

export async function generateProblem(
    request: { topic: string; difficulty: string; company?: string },
    token: string
): Promise<Problem> {
    const res = await fetch(`${BASE_URL}/problems/generate`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to generate AI problem');
    }
    return res.json();
}
