import React, { useState, useEffect, useRef } from 'react';
import {
    User as UserIcon,
    Lock,
    Mail,
    LogOut,
    Play,
    History,
    MessageSquare,
    Mic,
    MicOff,
    Send,
    Award,
    ChevronRight,
    Loader2,
    BookOpen
} from 'lucide-react';
import {
    login,
    register,
    createInterviewSession,
    getSessionHistory,
    endInterviewSession,
    streamChatMessage,
    type ChatMessage,
    type InterviewSession
} from './services/api'

const CSE_ROLES = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Mobile App Developer (iOS/Android)',
    'DevOps Engineer',
    'Cloud Engineer',
    'Data Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'AI Engineer',
    'Database Administrator (DBA)',
    'SQL Developer',
    'Cybersecurity Analyst / Engineer',
    'Systems Engineer',
    'SDET / QA Engineer',
    'Embedded Systems / IoT Engineer',
    'Blockchain Developer',
    'Product Manager',
    'UI/UX Designer',
    'Site Reliability Engineer (SRE)'
];


type ViewState = 'auth' | 'dashboard' | 'interview' | 'scorecard';

function App() {
    //Navigation and Session State
    const [view, setView] = useState<ViewState>('auth');
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

    // Data States
    const [history, setHistory] = useState<InterviewSession[]>([]);
    const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);

    //auth form state
    const [isLogin, setIsLogin] = useState(true);
    const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    //new session from state
    const [roleInput, setRoleInput] = useState('Software Engineer');
    const [sessionLoading, setSessionLoading] = useState(false);

    //Active chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    //auto-scroll chat to the bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView(
            { behavior: 'smooth' }
        );
    }, [chatMessages]);

    //load sessiion history when logging in or returning
    useEffect(() => {
        if (token) {
            setView('dashboard');
            fetchHistory();
        } else {
            setView('auth')
        }
    }, [token])

    const fetchHistory = async () => {
        if (!token) return;
        try {
            const data = await getSessionHistory(token);
            setHistory(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.log('Failer to load session history', err);
        }
    };
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
        setView('auth');
    }

    //authentication handles
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            if (isLogin) {
                const res = await login({
                    username: authForm.username,
                    password: authForm.password
                });
                localStorage.setItem('token', res.token);
                localStorage.setItem('username', res.username);
                setUsername(res.username);
                setToken(res.token);
            } else {
                const res = await register(authForm);
                localStorage.setItem('token', res.token);
                localStorage.setItem('username', res.username);
                setUsername(res.username);
                setToken(res.token);
            }
        } catch (err: any) {
            setAuthError(err.message || 'Authentication Failed');
        } finally {
            setAuthLoading(false);
        }
    }

    //interview session lifecycle
    const handleStartInterview = async (role: string) => {
        if (!token || !role.trim()) return;
        setSessionLoading(true);
        try {
            const session = await createInterviewSession(role, null, token);
            setActiveSession(session);
            setChatMessages(session.messages || []);
            setView('interview');
            // Trigger first question by sending a system prompt indicator
            setTimeout(() => triggerAiPrompt(session.id, "Hello! I am ready to start the interview."), 200);
        } catch (err) {
            console.error(err);
            alert('Could not start interview session.');
        } finally {
            setSessionLoading(false);
        }
    };
    const handleViewScorecard = async (session: InterviewSession) => {
        setActiveSession(session);
        setView('scorecard');
    };
    const handleEndInterview = async () => {
        if (!token || !activeSession) return;
        const confirmEnd = window.confirm('Are you sure you want to end this interview and receive your scorecard?');
        if (!confirmEnd) return;

        setSessionLoading(true);
        try {
            const completedSession = await endInterviewSession(activeSession.id, token);
            setActiveSession(completedSession);
            fetchHistory();
            setView('scorecard');
        } catch (err) {
            console.error(err);
            alert('Failed to evaluate interview. Please try again.');
        } finally {
            setSessionLoading(false);
        }
    };

    const handleAutoEndInterview = async () => {
        if (!token || !activeSession) return;
        setSessionLoading(true);
        try {
            const completedSession = await endInterviewSession(activeSession.id, token);
            setActiveSession(completedSession);
            fetchHistory();
            setView('scorecard');
        } catch (err) {
            console.error("Auto-evaluation failed", err);
        } finally {
            setSessionLoading(false);
        }
    };


    // streaming chat actions
    const triggerAiPrompt = async (sessionId: string, initialMsg: string) => {
        if (!token) return;
        setIsStreaming(true);

        // Add an empty AI bubble placeholder to stream tokens into
        setChatMessages(prev => [...prev, { sender: 'AI', message: '' }]);
        await streamChatMessage(
            sessionId,
            initialMsg,
            token,
            (textChunk) => {
                setChatMessages(prev => {
                    if (prev.length === 0) return prev;
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.sender === 'AI') {
                        const updatedLastMsg = { ...lastMsg, message: lastMsg.message + textChunk };
                        return [...prev.slice(0, -1), updatedLastMsg];
                    }
                    return prev;
                });
            },

            () => {
                setIsStreaming(false);
                setChatMessages(prev => {
                    if (prev.length === 0) return prev;
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.sender === 'AI' && lastMsg.message.includes('[INTERVIEW_OVER]')) {
                        const cleanMessage = lastMsg.message.replace('[INTERVIEW_OVER]', '').trim();
                        const updatedLastMsg = { ...lastMsg, message: cleanMessage };
                        // Trigger evaluation page transition
                        setTimeout(() => handleAutoEndInterview(), 100);
                        return [...prev.slice(0, -1), updatedLastMsg];
                    }
                    return prev;
                });
            },

            (err) => {
                console.error(err);
                setIsStreaming(false);
                setChatMessages(prev => [...prev, { sender: 'AI', message: 'Failed to receive response stream.' }]);
            }
        );
    };
    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isStreaming || !activeSession || !token) return;
        const userMessage = chatInput;
        setChatInput('');

        // Append the user's message to the layout
        setChatMessages(prev => [...prev, { sender: 'USER', message: userMessage }]);
        // Call the streaming engine
        triggerAiPrompt(activeSession.id, userMessage);
    };

    // speech to text (web speech api)
    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech Recognition is not supported in this browser. Please use Google Chrome.');
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setChatInput(prev => (prev ? prev + ' ' + transcript : transcript));
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };
        recognition.onend = () => {
            setIsRecording(false);
        };
        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    // render views
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(10, 11, 16, 0.5)',
                backdropFilter: 'blur(8px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award style={{ color: 'var(--accent-violet)' }} size={28} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.5px' }}>SmartPrep AI</h2>
                </div>
                {token && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Welcome, <strong>{username}</strong></span>
                        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.875rem' }}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                )}
            </header>

            {/* Main panel Router */}
            <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>

                {/* view 1 authentication portal */}
                {view === 'auth' && (
                    <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '32px', alignSelf: 'center' }}>
                        <h1 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '8px' }}>
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '0.875rem' }}>
                            {isLogin ? 'Practice mock interviews and track progress' : 'Sign up to start mock assessments'}
                        </p>
                        {authError && (
                            <div style={{
                                background: 'rgba(244, 63, 94, 0.1)',
                                border: '1px solid var(--accent-rose)',
                                color: 'var(--accent-rose)',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                fontSize: '0.875rem'
                            }}>
                                {authError}
                            </div>
                        )}
                        <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Username</label>
                                <div style={{ position: 'relative' }}>
                                    <UserIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="Enter username"
                                        value={authForm.username}
                                        onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            {!isLogin && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                        <input
                                            type="email"
                                            className="input-field"
                                            style={{ paddingLeft: '40px' }}
                                            placeholder="name@example.com"
                                            value={authForm.email}
                                            onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                    <input
                                        type="password"
                                        className="input-field"
                                        style={{ paddingLeft: '40px' }}
                                        placeholder="••••••••"
                                        value={authForm.password}
                                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={authLoading}>
                                {authLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Login' : 'Sign Up')}
                            </button>
                        </form>
                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            </span>
                            <button
                                onClick={() => { setIsLogin(!isLogin); setAuthError(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-violet)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                {isLogin ? 'Create one' : 'Sign in'}
                            </button>
                        </div>
                    </div>
                )}

                {/* view 2 practise dashboard */}
                {view === 'dashboard' && (
                    <div style={{ width: '100%', maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

                        {/* Left Column: Launch Assessment/Interview */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1.25rem' }}>
                                    <Play style={{ color: 'var(--accent-violet)' }} size={20} /> Setup Mock Interview
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
                                    Select or type the job role you want to practice. The AI interviewer will adjust questions and difficulty context dynamically.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target Job Role</label>
                                        <select
                                            className="input-field"
                                            value={roleInput}
                                            onChange={e => setRoleInput(e.target.value)}
                                        >
                                            {CSE_ROLES.map(role => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={() => handleStartInterview(roleInput)}
                                        className="btn-primary"
                                        style={{ marginTop: '8px' }}
                                        disabled={!roleInput.trim() || sessionLoading}
                                    >
                                        {sessionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Start AI Interview Session'}
                                    </button>
                                </div>
                            </div>
                            {/* Assessment Placeholder Widget */}
                            <div className="glass-card" style={{ padding: '24px', opacity: 0.85 }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1.25rem' }}>
                                    <BookOpen style={{ color: 'var(--accent-cyan)' }} size={20} /> Online Assessments (OA)
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
                                    Practice real-world coding challenges and SQL scripts on our isolated compiler nodes.
                                </p>
                                <button className="btn-secondary" style={{ width: '100%' }} disabled>
                                    Coming soon in Phase 4!
                                </button>
                            </div>
                        </div>
                        {/* Right Column: Past Histories */}
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1.25rem' }}>
                                <History style={{ color: 'var(--accent-violet)' }} size={20} /> Practice History
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                                {history.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                        <MessageSquare size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '0.875rem' }}>No mock interview sessions recorded yet.</p>
                                    </div>
                                ) : (
                                    history.map(session => (
                                        <div
                                            key={session.id}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                border: '1px solid var(--glass-border)',
                                                padding: '16px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <h4 style={{ fontWeight: 600, fontSize: '0.975rem' }}>{session.role}</h4>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(session.createdAt).toLocaleDateString()} • {session.status}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                {session.status === 'COMPLETED' ? (
                                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.8125rem' }}>
                                                        <span style={{ color: 'var(--accent-violet)' }}>Comm: <strong>{session.communicationScore}%</strong></span>
                                                        <span style={{ color: 'var(--accent-cyan)' }}>Domain: <strong>{session.domainKnowledgeScore}%</strong></span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                        In Progress
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleViewScorecard(session)}
                                                    className="btn-secondary"
                                                    style={{ padding: '8px', borderRadius: '50%' }}
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* view 3 active mock interview session */}
                {view === 'interview' && activeSession && (
                    <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{activeSession.role} Mock Interview</h2>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status: <strong>Active Q&A Session</strong></span>
                                </div>
                                <button onClick={handleEndInterview} className="btn-secondary" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
                                    End & Evaluate
                                </button>
                            </div>
                            {/* Chat Log Panel */}
                            <div className="chat-container">
                                {chatMessages.length === 0 ? (
                                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                                        <Loader2 className="animate-spin" style={{ margin: 'auto', marginBottom: '8px' }} />
                                        <p style={{ fontSize: '0.875rem' }}>Initializing AI interviewer context...</p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, index) => (
                                        <div key={index} className={`chat-bubble ${msg.sender.toLowerCase()}`}>
                                            <strong>{msg.sender === 'AI' ? 'Interviewer' : 'You'}:</strong>
                                            <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                                                {msg.message || (isStreaming && index === chatMessages.length - 1 ? '●' : '')}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>
                            {/* Message Input Panel */}
                            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                                {/* Voice Record Button */}
                                <button
                                    type="button"
                                    onClick={toggleRecording}
                                    className={`btn-secondary ${isRecording ? 'animate-pulse-glow' : ''}`}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: isRecording ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: isRecording ? 'var(--accent-rose)' : 'var(--glass-border)'
                                    }}
                                    title={isRecording ? 'Recording... click to stop' : 'Record response via microphone'}
                                >
                                    {isRecording ? <MicOff size={20} style={{ color: 'var(--accent-rose)' }} /> : <Mic size={20} style={{ color: 'var(--text-secondary)' }} />}
                                </button>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder={isStreaming ? 'AI is speaking...' : (isRecording ? 'Listening...' : 'Type your answer...')}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    disabled={isStreaming}
                                />

                                <button type="submit" className="btn-primary" disabled={isStreaming || !chatInput.trim()}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* view4 evaluation scorecard */}
                {view === 'scorecard' && activeSession && (
                    <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                            <Award style={{ color: 'var(--accent-violet)', marginBottom: '12px' }} size={48} />
                            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Interview Scorecard</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '32px' }}>
                                Role: <strong>{activeSession.role}</strong> • {new Date(activeSession.createdAt).toLocaleDateString()}
                            </p>
                            {activeSession.status === 'COMPLETED' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                    {/* Performance Gauges */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '64px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div className="circle-progress-container">
                                                <svg className="circle-svg">
                                                    <circle className="circle-bg" cx="60" cy="60" r="54" />
                                                    <circle
                                                        className="circle-bar"
                                                        cx="60" cy="60" r="54"
                                                        style={{ strokeDashoffset: 339.29 - (339.29 * (activeSession.communicationScore || 0)) / 100 }}
                                                    />
                                                </svg>
                                                <span className="circle-text">{activeSession.communicationScore}%</span>
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Communication</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div className="circle-progress-container">
                                                <svg className="circle-svg">
                                                    <circle className="circle-bg" cx="60" cy="60" r="54" />
                                                    <circle
                                                        className="circle-bar cyan"
                                                        cx="60" cy="60" r="54"
                                                        style={{ strokeDashoffset: 339.29 - (339.29 * (activeSession.domainKnowledgeScore || 0)) / 100 }}
                                                    />
                                                </svg>
                                                <span className="circle-text">{activeSession.domainKnowledgeScore}%</span>
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Domain Knowledge</span>
                                        </div>
                                    </div>
                                    {/* AI Feedback Observations */}
                                    <div style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '12px' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--accent-violet)' }}>Hiring Manager Feedback</h3>
                                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '0.925rem' }}>
                                            {activeSession.feedback}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '32px 0', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '1rem', marginBottom: '16px' }}>This interview session is still in progress and has not been evaluated.</p>
                                    <button onClick={() => { setView('interview'); setChatMessages(activeSession.messages); }} className="btn-primary">
                                        Resume Practice Session
                                    </button>
                                </div>
                            )}
                            <button onClick={() => { setView('dashboard'); fetchHistory(); }} className="btn-secondary" style={{ marginTop: '32px', width: '100%' }}>
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* footer */}
            <footer style={{ textAlign: 'center', padding: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)' }}>
                © 2026 SmartPrep. Powered by Groq Cloud LPU Inference Engine.
            </footer>
        </div>
    )
}

export default App;