import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  topics: string[];
  created_at: string;
}

interface ConversationsByDate {
  [date: string]: ChatMessage[];
}

interface StudentConversationHistoryProps {
  subject: string;
  classLevel: string;
  onClose: () => void;
}

export function StudentConversationHistory({ subject, classLevel, onClose }: StudentConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationsByDate>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    end: new Date().toISOString().split('T')[0]
  });
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Extract base subject (e.g., "SVT" from "SVT 5e")
  const getBaseSubject = (fullSubject: string) => {
    return fullSubject.split(' ')[0];
  };

  useEffect(() => {
    loadConversationHistory();
  }, [subject, classLevel, dateRange, searchTerm]);

  const loadConversationHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const baseSubject = getBaseSubject(subject);
      console.log('Fetching messages for:', { subject: baseSubject, classLevel });

      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('subject', baseSubject)
        .eq('class_level', classLevel)
        .eq('student_id', user.id)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Filter messages by search term
      const filteredMessages = (messages || []).filter(msg =>
        searchTerm ? msg.content.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );

      // Group messages by date
      const groupedMessages = filteredMessages.reduce((acc, msg) => {
        const date = new Date(msg.created_at).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(msg);
        return acc;
      }, {} as ConversationsByDate);

      setConversations(groupedMessages);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Mon historique - {subject}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher dans mes conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date début</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date fin</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement de l'historique...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(conversations).map(([date, messages]) => (
                <div key={date} className="border rounded-lg">
                  <button
                    onClick={() => toggleDateExpansion(date)}
                    className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                  >
                    <div className="flex items-center gap-2">
                      {expandedDates.has(date) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span>{date}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {messages.length} messages
                    </span>
                  </button>

                  {expandedDates.has(date) && (
                    <div className="p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.role === 'assistant'
                              ? 'bg-blue-50 ml-4'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium">
                              {message.role === 'assistant' ? 'Assistant' : 'Moi'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="prose max-w-none"
                          >
                            {message.content}
                          </ReactMarkdown>
                          {message.topics?.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {message.topics.map(topic => (
                                <span
                                  key={topic}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {Object.keys(conversations).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucune conversation trouvée
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}