"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth";

export default function StudentChatPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any | null>(null);
  
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; confidence?: number }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load enrolled courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const enrolled = await authService.getEnrolledCourses();
        setCourses(enrolled);
        if (enrolled.length > 0) {
          setSelectedCourseId(enrolled[0].id);
        }
      } catch (err) {
        console.error("Failed to load courses for chat:", err);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  // Load conversations for the selected course
  const loadConversations = async () => {
    if (!selectedCourseId) return;
    setLoadingConvs(true);
    try {
      const data = await authService.getConversations();
      const courseConvs = data.filter((c) => c.course_id === selectedCourseId);
      setConversations(courseConvs);
      
      if (courseConvs.length > 0) {
        handleSelectConversation(courseConvs[0].id);
      } else {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [selectedCourseId]);

  const handleSelectConversation = async (convId: string) => {
    setLoadingChat(true);
    try {
      const data = await authService.getConversation(convId);
      setCurrentConversation(data);
      
      const formatted = [];
      for (const q of data.questions || []) {
        formatted.push({ role: "user" as const, content: q.question });
        if (q.response) {
          formatted.push({ role: "assistant" as const, content: q.response, confidence: q.confidence_score });
        }
      }
      setMessages(formatted);
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedCourseId) return;
    setLoadingChat(true);
    try {
      const course = courses.find((c) => c.id === selectedCourseId);
      const title = `Session: ${course?.title || "Class Study"}`;
      const newConv = await authService.createConversation(selectedCourseId, title);
      
      const data = await authService.getConversations();
      const courseConvs = data.filter((c) => c.course_id === selectedCourseId);
      setConversations(courseConvs);
      
      setCurrentConversation(newConv);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentConversation || sendingMessage) return;

    const userText = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setSendingMessage(true);

    try {
      const res = await authService.askQuestion(currentConversation.id, userText);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response, confidence: res.confidence_score }
      ]);
    } catch (err) {
      console.error("Failed to submit question:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I am having trouble connecting to my cognitive slide databases right now. Please try again." }
      ]);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loadingCourses) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-handwriting text-2xl">
        Connecting neural tutor link...
      </div>
    );
  }

  // Handle case where user is not enrolled in any courses
  if (courses.length === 0) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center p-4">
        <div className="sketch-card p-8 max-w-lg bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg text-center space-y-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
          <div className="flex justify-center text-orange-500">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold font-handwriting text-[#E75A3D]">No Enrolled Courses</h3>
          <p className="font-casual text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            The AI Tutor needs to study your class slide documents to answer your questions. Please enroll in a course first to start a chat session.
          </p>
          <button
            onClick={() => router.push("/student/courses")}
            className="sketch-btn-primary py-2.5 px-6 font-handwriting text-base"
          >
            Go to Courses Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-5">
      {/* Top Bar / Course Selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-5 border-2 border-black dark:border-zinc-800 rounded-lg">
        <div>
          <h2 className="text-3xl font-bold font-handwriting text-[#E75A3D]">
            AI Tutor Assistance
          </h2>
          <p className="text-sm font-casual text-zinc-500 mt-0.5">
            Ask questions grounded directly in your class slide documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="p-2.5 border-2 border-black dark:border-white rounded-md text-sm font-casual bg-transparent w-full sm:w-64"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code}: {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-5 min-h-0">
        {/* Left Column: Conversation Sidebar */}
        <div className="md:col-span-1 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            <h3 className="text-xs uppercase font-bold tracking-wider font-casual text-zinc-400">
              Conversations
            </h3>

            {loadingConvs ? (
              <p className="text-sm font-casual text-zinc-400">Loading list...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm font-casual text-zinc-400">No sessions yet.</p>
            ) : (
              <div className="space-y-2.5">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left p-3 border-2 rounded-md font-handwriting text-base font-bold block transition-all ${
                      currentConversation?.id === conv.id
                        ? "bg-[#E75A3D] text-white border-black"
                        : "bg-transparent border-transparent hover:border-black dark:hover:border-zinc-850"
                    }`}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateConversation}
            className="sketch-btn-secondary w-full py-2.5 font-handwriting text-sm mt-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            + New Study Session
          </button>
        </div>

        {/* Right Column: Chat Messages Area */}
        <div className="md:col-span-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg flex flex-col justify-between min-h-0">
          {/* Messages list */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {loadingChat ? (
              <div className="h-full flex items-center justify-center font-handwriting text-lg text-zinc-400">
                Opening conversation folders...
              </div>
            ) : !currentConversation ? (
              <div className="h-full flex items-center justify-center flex-col text-center p-6 text-zinc-400 space-y-3">
                <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="font-handwriting text-xl">Select or create a study session to begin.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-center p-6 text-zinc-400 space-y-3">
                <svg className="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="font-casual text-sm">Start the chat session by asking a question about course slides.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3.5 max-w-[85%] ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full border border-black flex items-center justify-center text-sm font-bold bg-zinc-100 dark:bg-zinc-800 select-none shrink-0">
                      {msg.role === "user" ? (
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div
                      className={`p-4 border-2 border-black rounded-lg text-sm md:text-base font-casual ${
                        msg.role === "user"
                          ? "bg-orange-50 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : "bg-zinc-50 dark:bg-zinc-800/40 text-black dark:text-white"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.confidence !== undefined && (
                        <span className="text-[10px] text-zinc-400 mt-2.5 block font-mono text-right">
                          Confidence score: {msg.confidence.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {sendingMessage && (
                  <div className="flex gap-3.5 max-w-[85%] mr-auto items-center">
                    <div className="w-9 h-9 rounded-full border border-black flex items-center justify-center bg-zinc-150 dark:bg-zinc-800 shrink-0 animate-bounce">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-handwriting text-sm text-zinc-400">Tutor is reading slides...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2.5"
          >
            <input
              type="text"
              disabled={!currentConversation || sendingMessage}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about the lecture slides..."
              className="flex-1 py-2.5 px-4 border-2 border-black dark:border-white rounded-md text-sm font-casual bg-transparent outline-none focus:ring-2 focus:ring-[#E75A3D]"
            />
            <button
              type="submit"
              disabled={!currentConversation || sendingMessage || !inputValue.trim()}
              className="sketch-btn-primary py-2.5 px-5 font-handwriting text-sm"
            >
              Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
