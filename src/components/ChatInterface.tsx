import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Upload, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithDeepseek } from '../lib/deepseek';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  subject: string;
  onClose: () => void;
  initialMessage?: string;
  resourcePath?: string;
  isTeacher?: boolean;
}

export function ChatInterface({ subject, onClose, initialMessage, resourcePath, isTeacher = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || '');
  const [loading, setLoading] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [currentPDFPath, setCurrentPDFPath] = useState<string | undefined>(resourcePath);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialMessageSentRef = useRef(false);

  // Extract base subject and class level from the full subject string
  const parseSubject = (fullSubject: string): { baseSubject: string; classLevel: string } => {
    // Remove "Enseignant " prefix if it exists
    const withoutPrefix = fullSubject.replace('Enseignant ', '');
    const parts = withoutPrefix.split(' ');
    
    // If we have both subject and class level (e.g., "SVT 5e")
    if (parts.length >= 2) {
      return {
        baseSubject: parts[0],
        classLevel: parts[1]
      };
    }
    
    // If we only have the subject, try to extract class level from it
    const classLevelMatch = withoutPrefix.match(/(\d+e|2nde|1ere|terminale)$/i);
    if (classLevelMatch) {
      const classLevel = classLevelMatch[1];
      const baseSubject = withoutPrefix.replace(classLevel, '').trim();
      return {
        baseSubject,
        classLevel
      };
    }
    
    // If no class level found, return just the subject
    return {
      baseSubject: parts[0],
      classLevel: ''
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const sendInitialMessage = async () => {
      if (initialMessage && !initialMessageSentRef.current) {
        initialMessageSentRef.current = true;
        await handleSubmit(new Event('submit') as any);
      }
    };
    sendInitialMessage();
  }, [initialMessage]);

  const saveMessage = async (content: string, role: 'user' | 'assistant') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { baseSubject, classLevel } = parseSubject(subject);

      console.log('Saving message:', {
        subject: baseSubject,
        classLevel,
        content,
        role
      });

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          student_id: user.id,
          content,
          role,
          subject: baseSubject,
          class_level: classLevel,
          topics: extractTopics(content)
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const extractTopics = (content: string): string[] => {
    const topics = new Set<string>();
    
    const topicIndicators = /(?:concept|notion|thème|chapitre)\s+(?:de\s+)?([A-Za-zÀ-ÿ\s]+?)(?=\.|,|\s{2}|$)/gi;
    let match;
    while ((match = topicIndicators.exec(content)) !== null) {
      if (match[1]) topics.add(match[1].trim());
    }

    const mathTerms = /(?:théorème|équation|fonction|propriété)\s+(?:de\s+)?([A-Za-zÀ-ÿ\s]+?)(?=\.|,|\s{2}|$)/gi;
    while ((match = mathTerms.exec(content)) !== null) {
      if (match[1]) topics.add(match[1].trim());
    }

    const literaryTerms = /(?:figure de style|personnage|auteur|période)\s+(?:de\s+)?([A-Za-zÀ-ÿ\s]+?)(?=\.|,|\s{2}|$)/gi;
    while ((match = literaryTerms.exec(content)) !== null) {
      if (match[1]) topics.add(match[1].trim());
    }

    return Array.from(topics);
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('La taille du fichier ne doit pas dépasser 50MB');
      return;
    }

    setUploadingPDF(true);

    try {
      const timestamp = new Date().getTime();
      const safeName = `${timestamp}_${file.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const filePath = `temp/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('resource-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setCurrentPDFPath(filePath);
      setMessages(prev => [...prev, {
        role: 'user',
        content: `J'ai téléchargé un nouveau document PDF : ${file.name}`
      }]);

      // Automatically ask for a summary
      setInput('Pouvez-vous me faire un résumé des points clés de ce document ?');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.');
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    await saveMessage(userMessage, 'user');
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

      const response = await chatWithDeepseek(subject, userMessage, currentPDFPath);
      
      const chars = response.split('');
      let currentContent = '';
      
      for (const char of chars) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 20));
        currentContent += char;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = currentContent;
          }
          return newMessages;
        });
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false;
        }
        return newMessages;
      });

      await saveMessage(response, 'assistant');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard.' 
      }]);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#343541] rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Assistant - {subject}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-300 mt-8">
              <h2 className="text-2xl font-bold mb-2">Assistant Pédagogique - {subject}</h2>
              <p>Comment puis-je vous aider aujourd'hui ?</p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`group ${
                message.role === 'assistant' 
                  ? 'bg-[#444654]' 
                  : ''
              } p-4 text-gray-100 flex`}
            >
              <div className="flex-1 max-w-3xl mx-auto">
                <div className="flex space-x-4">
                  <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                    message.role === 'assistant' ? 'bg-teal-500' : 'bg-blue-500'
                  }`}>
                    {message.role === 'assistant' ? 'A' : 'V'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 
                        prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 
                        prose-table:my-2 prose-hr:my-4 prose-pre:my-2 prose-blockquote:my-2
                        prose-code:px-1 prose-code:py-0.5 prose-code:bg-gray-800 prose-code:rounded
                        prose-strong:text-white prose-em:text-gray-300
                        prose-table:border-collapse prose-td:border prose-th:border
                        prose-td:px-4 prose-td:py-2 prose-th:px-4 prose-th:py-2
                        prose-th:bg-gray-700 prose-td:border-gray-600 prose-th:border-gray-600"
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
            {isTeacher && (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                  ref={fileInputRef}
                  disabled={uploadingPDF}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-white disabled:opacity-50"
                >
                  {uploadingPDF ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {uploadingPDF ? 'Téléchargement...' : 'Télécharger un PDF'}
                </button>
                {currentPDFPath && (
                  <span className="text-gray-400 text-sm">
                    PDF actif : {currentPDFPath.split('/').pop()}
                  </span>
                )}
              </div>
            )}
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Posez votre question... (Shift + Enter pour nouvelle ligne)"
                className="w-full pr-12 pl-4 py-3 bg-[#40414f] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600 resize-none"
                style={{ maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 bottom-2 p-1 rounded text-gray-400 hover:text-white disabled:hover:text-gray-400 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}