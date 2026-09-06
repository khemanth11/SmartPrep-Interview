import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
    User as UserIcon,
    Lock,
    Mail,
    LogOut,
    Play,
    History,
    Mic,
    MicOff,
    Award,
    Loader2,
    PhoneOff,
    Menu,
    X,
    Building,
    Target,
    CheckCircle2,
    BarChart3,
    Sparkles
} from 'lucide-react';


import {
    login,
    register,
    createInterviewSession,
    getSessionHistory,
    endInterviewSession,
    streamChatMessage,
    parseResume,
    getProblems,
    getProblemById,
    runCode,
    submitCode,
    getLatestSubmission,
    getSubmissionHistory,
    toggleProblemComplete,
    generateCompanyPrepPlan,
    getActiveCompanyPrepPlan,
    getUserAnalytics,
    generateProblem,
    type ChatMessage,
    type InterviewSession,
    type Problem,
    type TestCaseExecutionResult,
    type Submission,
    type CompanyPrepPlan,
    type UserAnalyticsResponse
} from './services/api';




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

const OPENING_QUESTIONS = [
    "Hey, thanks for joining. Tell me about yourself.",
    "Could you give me a quick introduction?",
    "Let's start with a brief introduction.",
    "Walk me through your background.",
    "Tell me a bit about yourself.",
    "Can you introduce yourself?",
    "I'd love to learn more about your background.",
    "Why don't you start by introducing yourself?",
    "Could you walk me through your experience so far?",
    "Tell me about your journey as an engineer.",
    "What have you been working on recently?",
    "Give me a quick overview of your background.",
    "Let's start with your story.",
    "Tell me about your professional experience.",
    "Walk me through your resume."
];



type ViewState = 'auth' | 'dashboard' | 'interview' | 'scorecard' | 'coding';

function App() {
    //Navigation and Session State
    const [view, setView] = useState<ViewState>('auth');
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

    // Data States
    const [history, setHistory] = useState<InterviewSession[]>([]);
    const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);

    // Handle OAuth2 redirect params (?token=...&username=...)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const oauthToken = searchParams.get('token');
        const oauthUsername = searchParams.get('username');

        if (oauthToken && oauthUsername) {
            localStorage.setItem('token', oauthToken);
            localStorage.setItem('username', oauthUsername);
            setToken(oauthToken);
            setUsername(oauthUsername);
            setView('dashboard');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

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
    // const [chatInput, setChatInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    // const recognitionRef = useRef<any>(null);

    // Voice Call Mode States
    // const [interviewMode, setInterviewMode] = useState<'chat' | 'voice'>('chat');
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [transcribedText, setTranscribedText] = useState('Listening...');
    const [aiSpokenText, setAiSpokenText] = useState('');
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);


    // Voice Call Refs
    const silenceTimeoutRef = useRef<any>(null);
    const autoRecognitionRef = useRef<any>(null);
    const isMutedRef = useRef<boolean>(false);
    const voiceModeActiveRef = useRef<boolean>(false);
    const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Real-Time Audio Visualizer Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const visualizerRef = useRef<HTMLDivElement | null>(null);

    // Speech Submission Trackers
    const latestTranscriptRef = useRef<string>('');
    const hasSubmittedRef = useRef<boolean>(false);

    // React State Sync Refs (to prevent stale closures in async voice handlers)
    const activeSessionRef = useRef<InterviewSession | null>(null);
    const isAiSpeakingRef = useRef<boolean>(false);

    useEffect(() => {
        activeSessionRef.current = activeSession;
    }, [activeSession]);

    useEffect(() => {
        isAiSpeakingRef.current = isAiSpeaking;
    }, [isAiSpeaking]);




    // Resume State
    const [resumeText, setResumeText] = useState<string | null>(null);
    const [resumeFileName, setResumeFileName] = useState<string | null>(null);
    const [uploadingResume, setUploadingResume] = useState(false);

    // Coding assessments state
    const [problems, setProblems] = useState<Problem[]>([]);
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
    const [editorCode, setEditorCode] = useState<string>('');
    const [editorLanguage, setEditorLanguage] = useState<string>('python');
    const [executionResults, setExecutionResults] = useState<TestCaseExecutionResult[]>([]);
    const [codeExecuting, setCodeExecuting] = useState<boolean>(false);
    const [codeSubmitting, setCodeSubmitting] = useState<boolean>(false);

    // Dynamic Standalone Arena states
    const [dashboardTab, setDashboardTab] = useState<'interview' | 'coding' | 'company' | 'analytics'>('interview');
    const [codingSearch, setCodingSearch] = useState<string>('');
    const [codingDifficulty, setCodingDifficulty] = useState<string>('all');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [activeConsoleTab, setActiveConsoleTab] = useState<'output' | 'submissions'>('output');

    // AI Problem Generator Modal States
    const [showAiGenModal, setShowAiGenModal] = useState(false);
    const [aiGenTopic, setAiGenTopic] = useState('Sliding Window');
    const [aiGenDifficulty, setAiGenDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [aiGenCompany, setAiGenCompany] = useState('Google');
    const [aiGenLoading, setAiGenLoading] = useState(false);


    // Organization Prep States
    const [companyPrepPlan, setCompanyPrepPlan] = useState<CompanyPrepPlan | null>(null);
    const [companyForm, setCompanyForm] = useState({ companyName: 'Google', role: 'Software Engineer', examDate: '', jobDescription: '' });
    const [companyLoading, setCompanyLoading] = useState(false);

    // Analytics States
    const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsResponse | null>(null);

    const fetchCompanyPrep = async () => {
        if (!token) return;
        try {
            const plan = await getActiveCompanyPrepPlan(token);
            setCompanyPrepPlan(plan);
        } catch (err) {
            console.warn("Failed to fetch company prep plan", err);
        }
    };

    const fetchAnalytics = async () => {
        if (!token) return;
        try {
            const analytics = await getUserAnalytics(token);
            setUserAnalytics(analytics);
        } catch (err) {
            console.warn("Failed to fetch user analytics", err);
        }
    };

    const handleGenerateCompanyPrep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !companyForm.companyName.trim() || !companyForm.role.trim()) return;
        setCompanyLoading(true);
        try {
            const plan = await generateCompanyPrepPlan(companyForm, token);
            setCompanyPrepPlan(plan);
        } catch (err: any) {
            alert(err.message || 'Failed to generate company preparation plan.');
        } finally {
            setCompanyLoading(false);
        }
    };

    // Load and cache SpeechSynthesis voices as soon as browser is ready
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            setVoices(allVoices);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);


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
            fetchProblems(); // Fetch problems list
            fetchCompanyPrep();
            fetchAnalytics();
        } else {
            setView('auth')
        }
    }, [token])


    // Cleanup Web Speech API and visualizer resources on unmount/route exit
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            stopVisualizer(); // Stop visualizer loop
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            if (autoRecognitionRef.current) {
                try {
                    autoRecognitionRef.current.stop();
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    const enterFullscreen = () => {
        try {
            const docEl = document.documentElement;
            if (docEl.requestFullscreen) {
                docEl.requestFullscreen();
            } else if ((docEl as any).webkitRequestFullscreen) {
                (docEl as any).webkitRequestFullscreen();
            } else if ((docEl as any).msRequestFullscreen) {
                (docEl as any).msRequestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen request failed", err);
        }
    };

    const exitFullscreen = () => {
        try {
            if (document.fullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen exit failed", err);
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;
        setUploadingResume(true);
        try {
            const result = await parseResume(file, token);
            setResumeText(result.text);
            setResumeFileName(file.name);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to upload or parse resume.');
        } finally {
            setUploadingResume(false);
        }
    };

    const handleClearResume = () => {
        setResumeText(null);
        setResumeFileName(null);
        const input = document.getElementById('resume-file-input') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
    };



    const fetchHistory = async () => {
        if (!token) return;
        try {
            const data = await getSessionHistory(token);
            setHistory(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (err) {
            console.log('Failer to load session history', err);
        }
    };

    const fetchProblems = async () => {
        if (!token) return;
        try {
            const data = await getProblems(token);
            setProblems(data);
        } catch (err) {
            console.error('Failed to load coding problems', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
        setView('auth');
        window.speechSynthesis.cancel();
        voiceModeActiveRef.current = false;
        stopVoiceListening();
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
            const session = await createInterviewSession(role, null, token, resumeText);
            setActiveSession(session);

            // 1. Pick a random greeting instantly (0ms wait time)
            const naturalGreeting = OPENING_QUESTIONS[Math.floor(Math.random() * OPENING_QUESTIONS.length)];
            setChatMessages([{ sender: 'AI', message: naturalGreeting }]);

            setView('interview');

            // 2. Auto-trigger voice mode & browser fullscreen
            voiceModeActiveRef.current = true;
            enterFullscreen();

            // 3. Speak the question immediately and start listening for the candidate's intro
            setTimeout(() => {
                speakText(naturalGreeting, () => {
                    startVoiceListening();
                });
            }, 200);
        } catch (err) {
            console.error(err);
            alert('Could not start interview session.');
        } finally {
            setSessionLoading(false);
        }
    };

    // Manual language toggler that loads standard skeletons
    const handleLanguageChange = (lang: string) => {
        setEditorLanguage(lang);
        if (selectedProblem) {
            let template = selectedProblem.systemTemplate || '';
            if (lang === 'javascript') template = selectedProblem.jsTemplate || '// JavaScript Solution\n';
            else if (lang === 'java') template = selectedProblem.javaTemplate || 'public class Solution {\n    // Java Solution\n}';
            else if (lang === 'cpp') template = selectedProblem.cppTemplate || '// C++ Solution\n#include <iostream>\nusing namespace std;\n';
            else if (lang === 'go') template = selectedProblem.goTemplate || '// Go Solution\npackage main\nimport "fmt"\n';

            setEditorCode(template);
            setExecutionResults([]);
        }
    };

    const handleGenerateAiProblem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !aiGenTopic.trim()) return;
        setAiGenLoading(true);
        try {
            const newProblem = await generateProblem({
                topic: aiGenTopic,
                difficulty: aiGenDifficulty,
                company: aiGenCompany
            }, token);
            setProblems(prev => [newProblem, ...prev]);
            setShowAiGenModal(false);
            // Launch directly into the coding workspace for the new problem
            handleStartCoding(newProblem);
        } catch (err: any) {
            alert(err.message || 'Failed to generate custom AI problem.');
        } finally {
            setAiGenLoading(false);
        }
    };


    // Load workspace with the user's latest code draft if they have run it before
    const handleStartCoding = async (problem: Problem) => {
        if (!token) return;
        setSessionLoading(true);
        try {
            const fullProblem = await getProblemById(problem.id, token);
            setSelectedProblem(fullProblem);
            setExecutionResults([]);
            setActiveConsoleTab('output');

            // Try fetching latest submission
            try {
                const latestSub = await getLatestSubmission(problem.id, token);
                if (latestSub) {
                    setEditorLanguage(latestSub.language.toLowerCase());
                    setEditorCode(latestSub.code);
                } else {
                    setEditorLanguage('python');
                    setEditorCode(fullProblem.systemTemplate || '');
                }
            } catch (err) {
                console.warn("Failed to fetch latest submission", err);
                setEditorLanguage('python');
                setEditorCode(fullProblem.systemTemplate || '');
            }

            // Fetch submissions history log list
            try {
                const historyList = await getSubmissionHistory(problem.id, token);
                setSubmissions(historyList);
            } catch (err) {
                console.warn("Failed to fetch submission history", err);
                setSubmissions([]);
            }

            setView('coding');
        } catch (err) {
            console.error(err);
            alert('Failed to load coding challenge workspace.');
        } finally {
            setSessionLoading(false);
        }
    };

    const handleRunCode = async () => {
        if (!token || !selectedProblem) return;
        setCodeExecuting(true);
        try {
            const results = await runCode(selectedProblem.id, editorCode, editorLanguage, token);
            setExecutionResults(results);
        } catch (err: any) {
            alert(err.message || 'Failed to execute code.');
        } finally {
            setCodeExecuting(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!token || !selectedProblem) return;
        const confirmSubmit = window.confirm('Are you sure you want to submit your code for hidden verification?');
        if (!confirmSubmit) return;

        setCodeSubmitting(true);
        try {
            const results = await submitCode(selectedProblem.id, editorCode, editorLanguage, token);
            setExecutionResults(results);

            // Refresh submission logs
            const historyList = await getSubmissionHistory(selectedProblem.id, token);
            setSubmissions(historyList);

            const allPassed = results.length > 0 && results.every(r => r.passed);
            if (allPassed) {
                alert('Congratulations! All test cases passed successfully!');
                setProblems(prev => prev.map(p => p.id === selectedProblem.id ? { ...p, isCompleted: true, solveStatus: 'SOLVED' } : p));
                fetchProblems();
            } else {
                alert('Some test cases failed. Review console output for details.');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to submit code.');
        } finally {
            setCodeSubmitting(false);
        }
    };

    const handleToggleComplete = async (probId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token) return;
        try {
            const res = await toggleProblemComplete(probId, token);
            setProblems(prev => prev.map(p => p.id === probId ? { ...p, isCompleted: res.isCompleted } : p));
        } catch (err) {
            console.error("Failed to toggle completion", err);
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
        exitFullscreen(); // Make sure to exit fullscreen
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
        exitFullscreen(); // Make sure to exit fullscreen
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
    // const triggerAiPrompt = async (sessionId: string, initialMsg: string) => {
    //     if (!token) return;
    //     setIsStreaming(true);

    //     // Add an empty AI bubble placeholder to stream tokens into
    //     setChatMessages(prev => [...prev, { sender: 'AI', message: '' }]);
    //     await streamChatMessage(
    //         sessionId,
    //         initialMsg,
    //         token,
    //         (textChunk) => {
    //             setChatMessages(prev => {
    //                 if (prev.length === 0) return prev;
    //                 const lastMsg = prev[prev.length - 1];
    //                 if (lastMsg && lastMsg.sender === 'AI') {
    //                     const updatedLastMsg = { ...lastMsg, message: lastMsg.message + textChunk };
    //                     return [...prev.slice(0, -1), updatedLastMsg];
    //                 }
    //                 return prev;
    //             });
    //         },

    //         () => {
    //             setIsStreaming(false);
    //             setChatMessages(prev => {
    //                 if (prev.length === 0) return prev;
    //                 const lastMsg = prev[prev.length - 1];
    //                 if (lastMsg && lastMsg.sender === 'AI' && lastMsg.message.includes('[INTERVIEW_OVER]')) {
    //                     const cleanMessage = lastMsg.message.replace('[INTERVIEW_OVER]', '').trim();
    //                     const updatedLastMsg = { ...lastMsg, message: cleanMessage };
    //                     // Trigger evaluation page transition
    //                     setTimeout(() => handleAutoEndInterview(), 100);
    //                     return [...prev.slice(0, -1), updatedLastMsg];
    //                 }
    //                 return prev;
    //             });
    //         },

    //         (err) => {
    //             console.error(err);
    //             setIsStreaming(false);
    //             setChatMessages(prev => [...prev, { sender: 'AI', message: 'Failed to receive response stream.' }]);
    //         }
    //     );
    // };
    // const handleSendChat = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (!chatInput.trim() || isStreaming || !activeSession || !token) return;
    //     const userMessage = chatInput;
    //     setChatInput('');

    //     // Append the user's message to the layout
    //     setChatMessages(prev => [...prev, { sender: 'USER', message: userMessage }]);
    //     // Call the streaming engine
    //     triggerAiPrompt(activeSession.id, userMessage);
    // };

    // -------------------------------------------------------------
    // INTERACTIVE VOICE CALL LOGIC (TTS & STT AUTO-SUBMIT)
    // -------------------------------------------------------------

    // Web Audio visualizer helper functions
    async function startVisualizer() {
        try {
            stopVisualizer();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 32; // gives 16 frequency bins
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
                if (!analyserRef.current || !visualizerRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);

                const bars = visualizerRef.current.children;
                for (let i = 0; i < Math.min(bars.length, 5); i++) {
                    const binIndex = Math.min(1 + i * 2, bufferLength - 1);
                    const rawValue = dataArray[binIndex]; // 0 to 255
                    // calculate scale factor (min scale 1, max scale 3.5)
                    const scaleValue = 1 + (rawValue / 255) * 3.5;
                    const bar = bars[i] as HTMLElement;
                    if (bar) {
                        bar.style.transform = `scaleY(${scaleValue})`;
                        bar.style.backgroundColor = rawValue > 30 ? 'var(--accent-emerald)' : 'var(--text-muted)';
                    }
                }
                animationRef.current = requestAnimationFrame(updateVolume);
            };

            animationRef.current = requestAnimationFrame(updateVolume);
        } catch (err) {
            console.warn("Could not start visualizer", err);
        }
    }

    function stopVisualizer() {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(() => { });
            }
            audioContextRef.current = null;
        }
        analyserRef.current = null;

        // Reset visualizer bars to flat
        if (visualizerRef.current) {
            const bars = visualizerRef.current.children;
            for (let i = 0; i < bars.length; i++) {
                const bar = bars[i] as HTMLElement;
                if (bar) {
                    bar.style.transform = 'scaleY(1)';
                    bar.style.backgroundColor = 'var(--text-muted)';
                }
            }
        }
    }

    const handleInterruptInterviewer = () => {
        if (isAiSpeaking) {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
            startVoiceListening();
        }
    };


    // Text-to-Speech (TTS) Engine
    const speakText = (text: string, onEnd?: () => void) => {
        window.speechSynthesis.cancel(); // cancel any active speech

        if (!text) {
            onEnd?.();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();

        // Pick Google US English or standard English voice if available
        const englishVoice = availableVoices.find(v =>
            v.lang.startsWith('en-US') && v.name.includes('Google')
        ) || availableVoices.find(v =>
            v.lang.startsWith('en')
        );

        if (englishVoice) utterance.voice = englishVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsAiSpeaking(true);
            setAiSpokenText(text);
        };

        utterance.onend = () => {
            setIsAiSpeaking(false);
            // Wait 350ms for the browser to release the audio hardware before starting microphone capture
            setTimeout(() => {
                onEnd?.();
            }, 350);
        };

        utterance.onerror = (e) => {
            console.error('TTS error', e);
            setIsAiSpeaking(false);
            // Wait 350ms for safety
            setTimeout(() => {
                onEnd?.();
            }, 350);
        };


        ttsUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // Speech-to-Text (STT) automated microphone listening
    const startVoiceListening = () => {
        stopVoiceListening();

        if (isMutedRef.current || !voiceModeActiveRef.current) return;

        // Reset submit trackers for the new turn
        hasSubmittedRef.current = false;
        latestTranscriptRef.current = '';

        // Start the visualizer
        startVisualizer();

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech Recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onstart = () => {
            setIsRecording(true);
            setTranscribedText('Listening...');
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Combine final and interim transcripts
            const currentText = (finalTranscript.trim() + ' ' + interimTranscript.trim()).trim();
            if (currentText) {
                setTranscribedText(currentText);
                latestTranscriptRef.current = currentText;
            }

            // Clear and reset 1.8 seconds silence threshold for natural speaking gaps
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            silenceTimeoutRef.current = setTimeout(() => {
                const answer = latestTranscriptRef.current.trim();
                if (answer && !hasSubmittedRef.current) {
                    hasSubmittedRef.current = true;
                    stopVoiceListening();
                    submitVoiceAnswer(answer);
                }
            }, 1800);
        };

        recognition.onerror = (event: any) => {
            console.error('STT error', event.error);
            if (event.error === 'no-speech') {
                // Restart listener if mic times out due to silence and we haven't submitted
                setTimeout(() => {
                    if (voiceModeActiveRef.current && !isAiSpeakingRef.current && !hasSubmittedRef.current) {
                        startVoiceListening();
                    }
                }, 500);
            } else {
                setIsRecording(false);
            }
        };


        recognition.onend = () => {
            setIsRecording(false);
            // Fallback: If the recognition engine stops on its own, submit whatever we have
            const answer = latestTranscriptRef.current.trim();
            if (answer && !hasSubmittedRef.current) {
                hasSubmittedRef.current = true;
                stopVoiceListening();
                submitVoiceAnswer(answer);
            }
        };

        autoRecognitionRef.current = recognition;
        recognition.start();
    };


    const stopVoiceListening = () => {

        // Stop the visualizer loop
        stopVisualizer();

        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        if (autoRecognitionRef.current) {
            try {
                autoRecognitionRef.current.stop();
            } catch (e) { }
            autoRecognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const submitVoiceAnswer = (answer: string) => {
        const currentSession = activeSessionRef.current;
        if (!currentSession || !token) return;

        setChatMessages(prev => [...prev, { sender: 'USER', message: answer }]);
        setTranscribedText('Processing answer...');
        triggerVoiceAiPrompt(currentSession.id, answer);
    };



    // Voice-exclusive AI Streaming endpoint
    const triggerVoiceAiPrompt = async (sessionId: string, initialMsg: string) => {
        if (!token) return;
        setIsStreaming(true);

        setChatMessages(prev => [...prev, { sender: 'AI', message: '' }]);
        let fullAiMessage = '';

        await streamChatMessage(
            sessionId,
            initialMsg,
            token,
            (textChunk) => {
                setChatMessages(prev => {
                    if (prev.length === 0) return prev;
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.sender === 'AI') {
                        fullAiMessage = lastMsg.message + textChunk;
                        return [...prev.slice(0, -1), { ...lastMsg, message: fullAiMessage }];
                    }
                    return prev;
                });
            },
            () => {
                setIsStreaming(false);

                // End evaluation check
                if (fullAiMessage.includes('[INTERVIEW_OVER]')) {
                    const cleanMessage = fullAiMessage.replace('[INTERVIEW_OVER]', '').trim();
                    setChatMessages(prev => {
                        if (prev.length === 0) return prev;
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.sender === 'AI') {
                            return [...prev.slice(0, -1), { ...lastMsg, message: cleanMessage }];
                        }
                        return prev;
                    });
                    speakText(cleanMessage, () => {
                        stopVoiceListening();
                        setTimeout(() => handleAutoEndInterview(), 100);
                    });
                    return;
                }

                // Speak and then start recording candidate response
                speakText(fullAiMessage, () => {
                    startVoiceListening();
                });
            },
            (err) => {
                console.error(err);
                setIsStreaming(false);
                setChatMessages(prev => [...prev, { sender: 'AI', message: 'Failed to receive response stream.' }]);
                speakText('Sorry, I encountered a connection error. Please try again.', () => {
                    startVoiceListening();
                });
            }
        );
    };

    // // Seamless toggling during active sessions
    // const toggleInterviewMode = () => {
    //     if (interviewMode === 'chat') {
    //         setInterviewMode('voice');
    //         voiceModeActiveRef.current = true;
    //         enterFullscreen(); // Enter fullscreen on switch

    //         const lastMsg = chatMessages[chatMessages.length - 1];
    //         if (lastMsg && lastMsg.sender === 'AI') {
    //             speakText(lastMsg.message, () => {
    //                 startVoiceListening();
    //             });
    //         } else {
    //             startVoiceListening();
    //         }
    //     } else {
    //         setInterviewMode('chat');
    //         voiceModeActiveRef.current = false;
    //         exitFullscreen(); // Exit fullscreen on switch back
    //         window.speechSynthesis.cancel();
    //         stopVoiceListening();
    //     }
    // };


    const toggleMute = () => {
        isMutedRef.current = !isMutedRef.current;
        setIsMuted(isMutedRef.current);
        if (isMutedRef.current) {
            stopVoiceListening();
            setTranscribedText('Microphone muted.');
        } else {
            if (!isAiSpeaking && voiceModeActiveRef.current) {
                startVoiceListening();
            }
        }
    };


    // speech to text (web speech api)
    // const toggleRecording = () => {
    //     if (isRecording) {
    //         recognitionRef.current?.stop();
    //         setIsRecording(false);
    //         return;
    //     }
    //     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    //     if (!SpeechRecognition) {
    //         alert('Speech Recognition is not supported in this browser. Please use Google Chrome.');
    //         return;
    //     }
    //     const recognition = new SpeechRecognition();
    //     recognition.continuous = true;
    //     recognition.interimResults = false;
    //     recognition.lang = 'en-US';
    //     recognition.onresult = (event: any) => {
    //         const transcript = event.results[event.results.length - 1][0].transcript;
    //         setChatInput(prev => (prev ? prev + ' ' + transcript : transcript));
    //     };
    //     recognition.onerror = (event: any) => {
    //         console.error('Speech recognition error', event.error);
    //         setIsRecording(false);
    //     };
    //     recognition.onend = () => {
    //         setIsRecording(false);
    //     };
    //     recognitionRef.current = recognition;
    //     recognition.start();
    //     setIsRecording(true);
    // };

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

                        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px 0', gap: '12px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or continue with</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <a
                                href="http://localhost:8080/oauth2/authorization/google"
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', padding: '10px', fontSize: '0.875rem' }}
                                title="Requires GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET env vars"
                            >
                                Google
                            </a>
                            <a
                                href="http://localhost:8080/oauth2/authorization/github"
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', padding: '10px', fontSize: '0.875rem' }}
                                title="Requires GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET env vars"
                            >
                                GitHub
                            </a>
                        </div>

                        {/* Demo 1-Click Guest Access Button */}
                        <button
                            type="button"
                            onClick={async () => {
                                setAuthLoading(true);
                                try {
                                    const guestUser = `guest_${Math.floor(1000 + Math.random() * 9000)}`;
                                    const guestPass = 'guestPass123!';
                                    try {
                                        const res = await register({ username: guestUser, email: `${guestUser}@cip.demo`, password: guestPass });
                                        localStorage.setItem('token', res.token);
                                        localStorage.setItem('username', res.username);
                                        setToken(res.token);
                                        setUsername(res.username);
                                        setView('dashboard');
                                    } catch {
                                        const res = await login({ username: guestUser, password: guestPass });
                                        localStorage.setItem('token', res.token);
                                        localStorage.setItem('username', res.username);
                                        setToken(res.token);
                                        setUsername(res.username);
                                        setView('dashboard');
                                    }
                                } catch (err: any) {
                                    setAuthError('Guest login failed.');
                                } finally {
                                    setAuthLoading(false);
                                }
                            }}
                            className="btn-secondary"
                            style={{ width: '100%', marginTop: '12px', borderColor: 'var(--accent-violet)', color: 'var(--accent-violet)', fontSize: '0.875rem' }}
                        >
                            ⚡ 1-Click Demo Guest Login
                        </button>

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
                    <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Tab Switcher Navigation */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', gap: '24px' }}>
                            <button
                                onClick={() => setDashboardTab('interview')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: dashboardTab === 'interview' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    borderBottom: dashboardTab === 'interview' ? '3px solid var(--accent-violet)' : 'none',
                                    padding: '8px 12px 12px 12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                AI Mock Interview
                            </button>
                            <button
                                onClick={() => setDashboardTab('coding')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: dashboardTab === 'coding' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    borderBottom: dashboardTab === 'coding' ? '3px solid var(--accent-violet)' : 'none',
                                    padding: '8px 12px 12px 12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Standalone Coding Arena
                            </button>
                            <button
                                onClick={() => setDashboardTab('company')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: dashboardTab === 'company' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    borderBottom: dashboardTab === 'company' ? '3px solid var(--accent-violet)' : 'none',
                                    padding: '8px 12px 12px 12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                🏢 Organization-Wise Prep
                            </button>
                            <button
                                onClick={() => { setDashboardTab('analytics'); fetchAnalytics(); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: dashboardTab === 'analytics' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    borderBottom: dashboardTab === 'analytics' ? '3px solid var(--accent-violet)' : 'none',
                                    padding: '8px 12px 12px 12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                📊 Analytics & Readiness
                            </button>
                        </div>

                        {dashboardTab === 'interview' ? (
                            /* Grid Layout for Mock Interview */
                            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                {/* Left Column: Setup Mock Interview */}
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

                                            <div>
                                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    Upload Resume / Project Profile (PDF or TXT, optional)
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.txt"
                                                        onChange={handleResumeUpload}
                                                        style={{ display: 'none' }}
                                                        id="resume-file-input"
                                                    />
                                                    <label
                                                        htmlFor="resume-file-input"
                                                        className="btn-secondary"
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px',
                                                            fontSize: '0.875rem',
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        {uploadingResume ? (
                                                            <>
                                                                <Loader2 className="animate-spin" size={16} />
                                                                Parsing Resume...
                                                            </>
                                                        ) : resumeFileName ? (
                                                            "Change Resume"
                                                        ) : (
                                                            "Upload Resume"
                                                        )}
                                                    </label>
                                                    {resumeFileName && (
                                                        <button
                                                            type="button"
                                                            onClick={handleClearResume}
                                                            className="btn-secondary"
                                                            style={{
                                                                padding: '10px',
                                                                borderColor: 'var(--accent-rose)',
                                                                color: 'var(--accent-rose)',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                                {resumeFileName && (
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '6px' }}>
                                                        ✓ Selected: {resumeFileName}
                                                    </p>
                                                )}
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
                                </div>
                                {/* Right Column: Practice History */}
                                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '1.25rem' }}>
                                        <History style={{ color: 'var(--accent-violet)' }} size={20} /> Practice History
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '400px' }}>
                                        {history.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '20px' }}>No session logs found. Launch a new interview to begin!</p>
                                        ) : (
                                            history.map((session) => (
                                                <div key={session.id} style={{
                                                    background: 'rgba(255, 255, 255, 0.01)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '8px',
                                                    padding: '14px 18px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}>
                                                    <div>
                                                        <h4 style={{ fontWeight: 600, fontSize: '0.925rem' }}>{session.role} Interview</h4>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                            {session.status === 'COMPLETED' ? (
                                                                <>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>Completed</span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: {((session.communicationScore || 0) + (session.domainKnowledgeScore || 0)) / 2} / 10</span>
                                                                </>
                                                            ) : (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--accent-violet)', background: 'rgba(124, 58, 237, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>In Progress</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {session.status === 'COMPLETED' ? (
                                                        <button onClick={() => handleViewScorecard(session)} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8125rem' }}>View Feedback</button>
                                                    ) : (
                                                        <button onClick={() => handleStartInterview(session.role)} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8125rem' }}>Resume</button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Structured DSA Learning Roadmap & Checklist View */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Overall Roadmap Progress Bar Card */}
                                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                🚀 DSA Preparation Roadmap
                                            </h2>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                                                Structured topic-by-topic algorithm curriculum. Check off questions as you master them!
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Search problem..."
                                                style={{ width: '180px', padding: '8px 14px', fontSize: '0.875rem' }}
                                                value={codingSearch}
                                                onChange={e => setCodingSearch(e.target.value)}
                                            />
                                            <select
                                                className="input-field"
                                                style={{ width: '130px', padding: '8px 12px', fontSize: '0.875rem' }}
                                                value={codingDifficulty}
                                                onChange={e => setCodingDifficulty(e.target.value)}
                                            >
                                                <option value="all">All Difficulties</option>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowAiGenModal(true)}
                                                className="btn-primary"
                                                style={{
                                                    padding: '8px 16px',
                                                    fontSize: '0.875rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'linear-gradient(135deg, var(--accent-violet), #ec4899)',
                                                    border: 'none',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <Sparkles size={16} /> Generate AI Challenge
                                            </button>
                                        </div>

                                    </div>

                                    {/* Calculated Overall Progress Stats */}
                                    {(() => {
                                        const total = problems.length;
                                        const completed = problems.filter(p => p.isCompleted || p.solveStatus === 'SOLVED').length;
                                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                        return (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '16px 20px', borderRadius: '10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        Overall Roadmap Completion
                                                    </span>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                                                        {completed} / {total} Completed ({pct}%)
                                                    </span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-emerald))', transition: 'width 0.4s ease' }}></div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {showAiGenModal && (
                                    <div style={{
                                        position: 'fixed',
                                        inset: 0,
                                        background: 'rgba(0, 0, 0, 0.75)',
                                        backdropFilter: 'blur(8px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 1000,
                                        padding: '16px'
                                    }}>
                                        <div className="glass-card" style={{
                                            width: '100%',
                                            maxWidth: '520px',
                                            padding: '28px',
                                            borderRadius: '16px',
                                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                                                    <Sparkles style={{ color: 'var(--accent-violet)' }} size={20} />
                                                    AI Coding Challenge Generator
                                                </h3>
                                                <button
                                                    onClick={() => setShowAiGenModal(false)}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <form onSubmit={handleGenerateAiProblem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                        DSA Topic / Algorithm Pattern
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="input-field"
                                                        placeholder="e.g. Sliding Window, Graph BFS, Trie, Dynamic Programming"
                                                        value={aiGenTopic}
                                                        onChange={e => setAiGenTopic(e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                            Difficulty
                                                        </label>
                                                        <select
                                                            className="input-field"
                                                            value={aiGenDifficulty}
                                                            onChange={e => setAiGenDifficulty(e.target.value as any)}
                                                        >
                                                            <option value="EASY">Easy</option>
                                                            <option value="MEDIUM">Medium</option>
                                                            <option value="HARD">Hard</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                            Target Company
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="input-field"
                                                            placeholder="e.g. Google, Meta, Amazon"
                                                            value={aiGenCompany}
                                                            onChange={e => setAiGenCompany(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    💡 Groq Llama 3.1 will synthesize an authentic problem description, multi-language starter stubs (Python, JS, Java, C++, Go), and hidden test cases.
                                                </p>

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAiGenModal(false)}
                                                        className="btn-secondary"
                                                        style={{ padding: '10px 16px' }}
                                                        disabled={aiGenLoading}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: 'linear-gradient(135deg, var(--accent-violet), #ec4899)',
                                                            border: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}
                                                        disabled={aiGenLoading || !aiGenTopic.trim()}
                                                    >
                                                        {aiGenLoading ? (
                                                            <>
                                                                <Loader2 className="animate-spin" size={16} />
                                                                Generating Challenge...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={16} />
                                                                Generate & Solve
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}


                                {/* Grouped Topic Modules List */}
                                {(() => {
                                    const filteredProblems = problems.filter(prob => {
                                        const matchSearch = prob.title.toLowerCase().includes(codingSearch.toLowerCase());
                                        const matchDiff = codingDifficulty === 'all' || prob.difficulty.toLowerCase() === codingDifficulty.toLowerCase();
                                        return matchSearch && matchDiff;
                                    });

                                    // Group problems by category
                                    const modulesMap: { [cat: string]: { order: number; items: Problem[] } } = {};
                                    filteredProblems.forEach(p => {
                                        const cat = p.category || 'Arrays & Hashing';
                                        const order = p.moduleOrder || 1;
                                        if (!modulesMap[cat]) {
                                            modulesMap[cat] = { order, items: [] };
                                        }
                                        modulesMap[cat].items.push(p);
                                    });

                                    const sortedCategories = Object.keys(modulesMap).sort((a, b) => modulesMap[a].order - modulesMap[b].order);

                                    if (sortedCategories.length === 0) {
                                        return (
                                            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No problems match your current search filters.
                                            </div>
                                        );
                                    }

                                    return sortedCategories.map(cat => {
                                        const moduleItems = modulesMap[cat].items;
                                        const modCompleted = moduleItems.filter(p => p.isCompleted || p.solveStatus === 'SOLVED').length;
                                        const modPct = Math.round((modCompleted / moduleItems.length) * 100);

                                        return (
                                            <div key={cat} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {/* Topic Header & Progress Bar */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                                            Module {modulesMap[cat].order}
                                                        </span>
                                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f8fafc' }}>{cat}</h3>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                            {modCompleted}/{moduleItems.length} Solved
                                                        </span>
                                                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${modPct}%`, height: '100%', background: modPct === 100 ? 'var(--accent-emerald)' : 'var(--accent-violet)', transition: 'width 0.3s ease' }}></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Problems Table under Topic Module */}
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem', width: '50px' }}>CHECK</th>
                                                                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>PROBLEM TITLE</th>
                                                                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>DIFFICULTY</th>
                                                                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>TAGS</th>
                                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTION</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {moduleItems.map(prob => {
                                                                const isChecked = prob.isCompleted || prob.solveStatus === 'SOLVED';
                                                                return (
                                                                    <tr
                                                                        key={prob.id}
                                                                        style={{
                                                                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                                            background: isChecked ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                                                                            transition: 'background 0.2s'
                                                                        }}
                                                                    >
                                                                        <td style={{ padding: '12px' }}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => handleToggleComplete(prob.id, e as any)}
                                                                                style={{
                                                                                    width: '18px',
                                                                                    height: '18px',
                                                                                    cursor: 'pointer',
                                                                                    accentColor: 'var(--accent-emerald)'
                                                                                }}
                                                                                title="Mark problem as completed"
                                                                            />
                                                                        </td>
                                                                        <td
                                                                            style={{
                                                                                padding: '12px',
                                                                                fontWeight: 600,
                                                                                fontSize: '0.9rem',
                                                                                color: isChecked ? 'var(--accent-emerald)' : '#f8fafc',
                                                                                textDecoration: isChecked ? 'line-through' : 'none',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                            onClick={() => handleStartCoding(prob)}
                                                                        >
                                                                            {prob.title}
                                                                        </td>
                                                                        <td style={{ padding: '12px' }}>
                                                                            <span style={{
                                                                                fontSize: '0.75rem',
                                                                                fontWeight: 600,
                                                                                padding: '2px 8px',
                                                                                borderRadius: '4px',
                                                                                background: prob.difficulty === 'EASY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                                color: prob.difficulty === 'EASY' ? 'var(--accent-emerald)' : '#f59e0b'
                                                                            }}>
                                                                                {prob.difficulty}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '12px' }}>
                                                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                {prob.tags.map(tag => (
                                                                                    <span key={tag} style={{
                                                                                        fontSize: '0.7rem',
                                                                                        color: 'var(--text-secondary)',
                                                                                        background: 'rgba(255,255,255,0.03)',
                                                                                        padding: '2px 6px',
                                                                                        borderRadius: '4px',
                                                                                        border: '1px solid var(--glass-border)'
                                                                                    }}>
                                                                                        {tag}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                                            <button
                                                                                onClick={() => handleStartCoding(prob)}
                                                                                className="btn-secondary"
                                                                                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                                                                            >
                                                                                Solve
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        {dashboardTab === 'company' && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Organization Prep Form */}
                                <div className="glass-card" style={{ padding: '28px' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '8px' }}>
                                        <Building style={{ color: 'var(--accent-violet)' }} size={24} /> Organization-Wise Prep & AI Roadmap
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                                        Target a specific company interview (e.g. Google, Amazon, Microsoft). Enter your upcoming exam date and Job Description to get an AI-ranked priority problem checklist.
                                    </p>

                                    <form onSubmit={handleGenerateCompanyPrep} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Target Company Name</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="e.g. Google, Amazon, Meta, Microsoft"
                                                value={companyForm.companyName}
                                                onChange={e => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Target Role / Title</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="e.g. Software Engineer, Backend SDE-2"
                                                value={companyForm.role}
                                                onChange={e => setCompanyForm({ ...companyForm, role: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Exam / Interview Date (Optional)</label>
                                            <input
                                                type="date"
                                                className="input-field"
                                                value={companyForm.examDate}
                                                onChange={e => setCompanyForm({ ...companyForm, examDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Job Description / Key Focus (Optional)</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Paste key requirements or tech stack..."
                                                value={companyForm.jobDescription}
                                                onChange={e => setCompanyForm({ ...companyForm, jobDescription: e.target.value })}
                                            />
                                        </div>

                                        <div style={{ gridColumn: 'span 2' }}>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                disabled={companyLoading}
                                                style={{ width: '100%', padding: '12px' }}
                                            >
                                                {companyLoading ? <Loader2 className="animate-spin" size={20} /> : `Generate ${companyForm.companyName || 'Company'} Prioritized Roadmap`}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Active Plan Roadmap View */}
                                {companyPrepPlan && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Countdown Header */}
                                        <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--accent-violet)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <Target style={{ color: 'var(--accent-violet)' }} size={28} />
                                                <div>
                                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{companyPrepPlan.companyName} ({companyPrepPlan.role}) Preparation Plan</h3>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {companyPrepPlan.examDate ? `Target Exam Date: ${companyPrepPlan.examDate}` : 'Self-Paced Preparation Track'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)', fontWeight: 600, fontSize: '0.875rem' }}>
                                                Active Roadmap
                                            </span>
                                        </div>

                                        {/* AI Strategy Summary */}
                                        {companyPrepPlan.aiStrategySummary && (
                                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '12px' }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-violet)', marginBottom: '8px' }}>🤖 AI Strategic Focus Summary</h4>
                                                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                                    {companyPrepPlan.aiStrategySummary}
                                                </p>
                                            </div>
                                        )}

                                        {/* Prioritized Problems List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Prioritized Problem Roadmap (High to Low Priority)</h4>
                                            {companyPrepPlan.prioritizedProblems.map(item => {
                                                const rawProb = problems.find(p => p.id === item.problemId);
                                                return (
                                                    <div
                                                        key={item.problemId}
                                                        className="glass-card"
                                                        style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(139, 92, 246, 0.15)',
                                                                color: 'var(--accent-violet)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                fontSize: '0.875rem'
                                                            }}>
                                                                #{item.priorityRank}
                                                            </div>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.title}</h4>
                                                                    <span style={{
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        background: item.difficulty === 'EASY' ? 'rgba(16, 185, 129, 0.15)' : item.difficulty === 'HARD' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                                        color: item.difficulty === 'EASY' ? 'var(--accent-emerald)' : item.difficulty === 'HARD' ? 'var(--accent-rose)' : 'var(--accent-amber)'
                                                                    }}>
                                                                        {item.difficulty}
                                                                    </span>
                                                                    {item.completed && (
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <CheckCircle2 size={14} /> Solved
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                                    {item.reason}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => rawProb && handleStartCoding(rawProb)}
                                                            className="btn-primary"
                                                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                                        >
                                                            Solve Challenge →
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {dashboardTab === 'analytics' && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="glass-card" style={{ padding: '24px' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '8px' }}>
                                        <BarChart3 style={{ color: 'var(--accent-violet)' }} size={24} /> Candidate Performance & Company Readiness Index
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        Real-time readiness percentages for top tech companies calculated from your solved coding challenges and mock interview evaluations.
                                    </p>
                                </div>

                                {userAnalytics && (
                                    <>
                                        {/* Company Readiness Radar Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Google L4 Readiness</h3>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-violet)' }}>
                                                    {userAnalytics.googleReadinessScore}%
                                                </div>
                                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)', display: 'inline-block', marginTop: '8px' }}>
                                                    {userAnalytics.googleReadinessScore >= 75 ? 'Interview Ready' : userAnalytics.googleReadinessScore >= 40 ? 'On Track' : 'Needs Practice'}
                                                </span>
                                            </div>

                                            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Amazon SDE-2 Readiness</h3>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                                    {userAnalytics.amazonReadinessScore}%
                                                </div>
                                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', display: 'inline-block', marginTop: '8px' }}>
                                                    {userAnalytics.amazonReadinessScore >= 75 ? 'Interview Ready' : userAnalytics.amazonReadinessScore >= 40 ? 'On Track' : 'Needs Practice'}
                                                </span>
                                            </div>

                                            <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Microsoft SDE-1 Readiness</h3>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                                                    {userAnalytics.microsoftReadinessScore}%
                                                </div>
                                                <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', display: 'inline-block', marginTop: '8px' }}>
                                                    {userAnalytics.microsoftReadinessScore >= 75 ? 'Interview Ready' : userAnalytics.microsoftReadinessScore >= 40 ? 'On Track' : 'Needs Practice'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Problem Breakdown */}
                                        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Problem Solving Breakdown</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Solved</span>
                                                    <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px' }}>{userAnalytics.totalProblemsSolved}</h4>
                                                </div>
                                                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>Easy</span>
                                                    <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px', color: 'var(--accent-emerald)' }}>{userAnalytics.easySolved}</h4>
                                                </div>
                                                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>Medium</span>
                                                    <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px', color: 'var(--accent-amber)' }}>{userAnalytics.mediumSolved}</h4>
                                                </div>
                                                <div style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)' }}>Hard</span>
                                                    <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4px', color: 'var(--accent-rose)' }}>{userAnalytics.hardSolved}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}


                {/* view 3 active mock interview session */}
                {view === 'interview' && activeSession && (
                    /* Immersive Voice Call Mode View Overlay */
                    <div className="call-overlay">
                        {sessionLoading && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(10, 11, 16, 0.85)',
                                backdropFilter: 'blur(12px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                zIndex: 2000
                            }}>
                                <Loader2 className="animate-spin" style={{ color: 'var(--accent-violet)' }} size={48} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Analyzing Interview...</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Compiling your scorecard and hiring feedback</p>
                            </div>
                        )}
                        <div className="call-header">

                            <h1>{activeSession.role} Mock Interview</h1>
                            <div className={`call-status ${isRecording ? 'listening' : ''}`}>
                                <div className="call-status-dot"></div>
                                <span>{isStreaming ? 'Interviewer is speaking...' : (isRecording ? 'Listening to you...' : 'Muted')}</span>
                            </div>
                        </div>

                        <div
                            className="avatar-wrapper"
                            onClick={handleInterruptInterviewer}
                            style={{ cursor: 'pointer' }}
                            title="Click to interrupt interviewer"
                        >
                            <div className={`avatar-ring ${isAiSpeaking ? 'active-speaking' : ''}`}></div>
                            <div className={`interviewer-avatar ${isAiSpeaking ? 'speaking' : ''}`}>
                                <UserIcon size={64} style={{ color: isAiSpeaking ? 'var(--accent-violet)' : 'var(--text-secondary)' }} />
                            </div>
                        </div>


                        <div
                            ref={visualizerRef}
                            className={`audio-visualizer ${isAiSpeaking ? 'speaking' : ''} ${isRecording ? 'listening' : ''}`}
                        >
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                        </div>



                        <div className="caption-card">
                            <span className="caption-label">{isAiSpeaking ? 'Interviewer (Audio)' : 'You (Microphone)'}</span>
                            <p className="caption-text">
                                {isAiSpeaking ? aiSpokenText : transcribedText}
                            </p>
                        </div>

                        <div className="call-controls">
                            <button
                                type="button"
                                onClick={toggleMute}
                                className={`btn-circle ${isMuted ? 'active danger' : ''}`}
                                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                            >
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`btn-circle ${isSidebarOpen ? 'active' : ''}`}
                                title="View Chat History"
                            >
                                <Menu size={20} />
                            </button>

                            <button
                                type="button"
                                onClick={handleEndInterview}
                                className="btn-circle danger"
                                title="End Interview"
                            >
                                <PhoneOff size={20} />
                            </button>
                        </div>

                        {/* Slide-out Sidebar for Chat History */}
                        <div className={`call-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                            <div className="sidebar-header">
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chat History</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="btn-secondary"
                                    style={{ padding: '6px', borderRadius: '50%' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="sidebar-content">
                                {chatMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            background: msg.sender === 'AI' ? 'rgba(255,255,255,0.03)' : 'rgba(139, 92, 246, 0.1)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            alignSelf: msg.sender === 'AI' ? 'flex-start' : 'flex-end',
                                            maxWidth: '90%',
                                            fontSize: '0.875rem',
                                            lineHeight: 1.4
                                        }}
                                    >
                                        <strong>{msg.sender === 'AI' ? 'Interviewer' : 'You'}:</strong>
                                        <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                                    </div>
                                ))}
                            </div>
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

                {/* view 5 Coding Workspace */}
                {view === 'coding' && selectedProblem && (
                    <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Top bar controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={() => { setView('dashboard'); fetchHistory(); }}
                                    className="btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    ← Dashboard
                                </button>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedProblem.title} Workspace</h1>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Language:</label>
                                <select
                                    className="input-field"
                                    style={{ width: '160px', padding: '6px 12px', fontSize: '0.875rem' }}
                                    value={editorLanguage}
                                    onChange={e => handleLanguageChange(e.target.value)}
                                >
                                    <option value="python">Python 3</option>
                                    <option value="javascript">JavaScript (Node)</option>
                                    <option value="java">Java (OpenJDK)</option>
                                    <option value="cpp">C++ (GCC)</option>
                                    <option value="go">Go (Golang)</option>
                                </select>
                            </div>
                        </div>

                        {/* Split Panes */}
                        <div style={{ display: 'grid', gridTemplateColumns: '4.5fr 5.5fr', gap: '24px', minHeight: '600px' }}>
                            {/* Left Pane: Instructions & Specifications */}
                            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '700px' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: selectedProblem.difficulty === 'EASY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: selectedProblem.difficulty === 'EASY' ? 'var(--accent-emerald)' : '#f59e0b'
                                        }}>
                                            {selectedProblem.difficulty}
                                        </span>
                                        {selectedProblem.tags.map(tag => (
                                            <span key={tag} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Problem Description</h2>
                                </div>

                                <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {selectedProblem.description}
                                </p>

                                {selectedProblem.inputFormat && (
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>Input Format</h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{selectedProblem.inputFormat}</p>
                                    </div>
                                )}

                                {selectedProblem.outputFormat && (
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>Output Format</h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{selectedProblem.outputFormat}</p>
                                    </div>
                                )}

                                {selectedProblem.constraints && (
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '4px' }}>Constraints</h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.4, background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                            {selectedProblem.constraints}
                                        </p>
                                    </div>
                                )}

                                {selectedProblem.sampleTestCases && selectedProblem.sampleTestCases.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-violet)', marginBottom: '8px' }}>Sample Test Cases</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {selectedProblem.sampleTestCases.map((tc, idx) => (
                                                <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Case {idx + 1}:</span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                                                        <div>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Input:</span>
                                                            <pre style={{ margin: '2px 0 0 0', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{tc.input}</pre>
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Output:</span>
                                                            <pre style={{ margin: '2px 0 0 0', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{tc.output}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: Code Editor & Console */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Editor Box */}
                                <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px', overflow: 'hidden' }}>
                                    <div style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>SOLUTION EDITOR</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-saving local draft</span>
                                    </div>
                                    <div style={{ flex: 1, minHeight: '380px', width: '100%' }}>
                                        <Editor
                                            height="100%"
                                            language={editorLanguage === 'python' ? 'python' : 'javascript'}
                                            theme="vs-dark"
                                            value={editorCode}
                                            onChange={val => setEditorCode(val || '')}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                lineNumbers: 'on',
                                                automaticLayout: true,
                                                tabSize: 4,
                                                scrollBeyondLastLine: false,
                                                readOnly: codeExecuting || codeSubmitting,
                                                padding: { top: 12, bottom: 12 }
                                            }}
                                        />
                                    </div>

                                    {/* Action Buttons footer */}
                                    <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button
                                            onClick={handleRunCode}
                                            className="btn-secondary"
                                            style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                                            disabled={codeExecuting || codeSubmitting || sessionLoading}
                                        >
                                            {codeExecuting ? <Loader2 className="animate-spin" size={16} /> : 'Run Code'}
                                        </button>
                                        <button
                                            onClick={handleSubmitCode}
                                            className="btn-primary"
                                            style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                                            disabled={codeExecuting || codeSubmitting || sessionLoading}
                                        >
                                            {codeSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit Assessment'}
                                        </button>
                                    </div>
                                </div>

                                {/* Console & Submissions Tabbed Panel */}
                                <div className="glass-card" style={{ height: '260px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '0 16px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '40px' }}>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <button
                                                onClick={() => setActiveConsoleTab('output')}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: activeConsoleTab === 'output' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    borderBottom: activeConsoleTab === 'output' ? '2px solid var(--accent-violet)' : 'none',
                                                    padding: '11px 0'
                                                }}
                                            >
                                                CONSOLE OUTPUT
                                            </button>
                                            <button
                                                onClick={() => setActiveConsoleTab('submissions')}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: activeConsoleTab === 'submissions' ? 'var(--accent-violet)' : 'var(--text-secondary)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    borderBottom: activeConsoleTab === 'submissions' ? '2px solid var(--accent-violet)' : 'none',
                                                    padding: '11px 0'
                                                }}
                                            >
                                                SUBMISSIONS ({submissions.length})
                                            </button>
                                        </div>
                                        {activeConsoleTab === 'output' && executionResults.length > 0 && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: executionResults.every(r => r.passed) ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                                            }}>
                                                {executionResults.every(r => r.passed) ? '✓ ALL CASES PASSED' : '✗ SOME CASES FAILED'}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', fontSize: '0.8125rem' }}>
                                        {activeConsoleTab === 'output' ? (
                                            executionResults.length === 0 ? (
                                                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>Press "Run Code" or "Submit Assessment" to evaluate your solution.</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'monospace' }}>
                                                    {executionResults.map((res, idx) => (
                                                        <div key={idx} style={{
                                                            borderLeft: `3px solid ${res.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                                                            paddingLeft: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '4px'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ fontWeight: 600, color: res.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                                                    Test Case {res.testCaseIndex}: {res.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                                <span style={{ color: 'var(--text-muted)' }}>{res.elapsedTimeMs} ms</span>
                                                            </div>
                                                            {res.error ? (
                                                                <pre style={{ color: 'var(--accent-rose)', margin: 0, whiteSpace: 'pre-wrap' }}>{res.error}</pre>
                                                            ) : (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-secondary)' }}>
                                                                    <div>Input: <span style={{ color: 'var(--text-primary)' }}>{res.input.replace(/\n/g, ' \\n ')}</span></div>
                                                                    <div>Expected: <span style={{ color: 'var(--accent-emerald)' }}>{res.expectedOutput}</span></div>
                                                                    <div>Actual: <span style={{ color: res.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{res.actualOutput}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            /* Submissions Tab Content */
                                            submissions.length === 0 ? (
                                                <span style={{ color: 'var(--text-muted)' }}>You have no submissions for this problem yet. Click "Submit Assessment" to make one.</span>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {submissions.map((sub) => (
                                                        <div key={sub.id} style={{
                                                            background: 'rgba(255, 255, 255, 0.02)',
                                                            border: '1px solid var(--glass-border)',
                                                            borderRadius: '6px',
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <div>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    <span style={{
                                                                        fontWeight: 600,
                                                                        color: sub.status === 'ACCEPTED' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                                                                    }}>
                                                                        {sub.status === 'ACCEPTED' ? 'Accepted' : sub.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        ({sub.passedCount}/{sub.totalCount} test cases)
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                                    Language: <span style={{ textTransform: 'capitalize' }}>{sub.language}</span> • {new Date(sub.submittedAt).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setEditorLanguage(sub.language.toLowerCase());
                                                                    setEditorCode(sub.code);
                                                                }}
                                                                className="btn-secondary"
                                                                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                                            >
                                                                Restore Code
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                            </div>
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