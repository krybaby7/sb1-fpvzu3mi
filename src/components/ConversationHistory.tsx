import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ChevronDown, ChevronRight, FileText, Clock, MessageSquare, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  student_id: string;
  content: string;
  role: 'user' | 'assistant';
  topics: string[];
  created_at: string;
  resource_path?: string;
  student?: {
    email: string;
    display_name: string;
  };
}

interface Conversation {
  id: string;
  messages: ChatMessage[];
  startTime: string;
  resourcePath?: string;
  messageCount: number;
  studentEmail?: string;
  studentName?: string;
}

interface ConversationsByDate {
  [date: string]: Conversation[];
}

interface ConversationHistoryProps {
  subject: string;
  classLevel: string;
  viewType: 'teacher' | 'student';
  onClose: () => void;
}

export function ConversationHistory({ subject, classLevel, viewType, onClose }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<ConversationsByDate>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  // Extract base subject (e.g., "SVT" from "SVT 5e" or "Enseignant SVT 5e")
  const getBaseSubject = (fullSubject: string) => {
    const withoutPrefix = fullSubject.replace('Enseignant ', '');
    return withoutPrefix.split(' ')[0];
  };

  const groupMessagesByConversation = (messages: ChatMessage[]): Conversation[] => {
    const conversations: Conversation[] = [];
    let currentConversation: ChatMessage[] = [];
    let lastMessageTime: Date | null = null;
    const CONVERSATION_BREAK_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    messages.forEach((message) => {
      const messageTime = new Date(message.created_at);
      
      if (lastMessageTime && 
          messageTime.getTime() - lastMessageTime.getTime() > CONVERSATION_BREAK_THRESHOLD) {
        if (currentConversation.length > 0) {
          const firstMessage = currentConversation[0];
          conversations.push({
            id: firstMessage.id,
            messages: [...currentConversation],
            startTime: firstMessage.created_at,
            resourcePath: firstMessage.resource_path,
            messageCount: currentConversation.length,
            studentEmail: firstMessage.student?.email,
            studentName: firstMessage.student?.display_name
          });
          currentConversation = [];
        }
      }

      currentConversation.push(message);
      lastMessageTime = messageTime;
    });

    if (currentConversation.length > 0) {
      const firstMessage = currentConversation[0];
      conversations.push({
        id: firstMessage.id,
        messages: [...currentConversation],
        startTime: firstMessage.created_at,
        resourcePath: firstMessage.resource_path,
        messageCount: currentConversation.length,
        studentEmail: firstMessage.student?.email,
        studentName: firstMessage.student?.display_name
      });
    }

    return conversations;
  };

  const loadConversationHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const baseSubject = getBaseSubject(subject);
      console.log('Fetching messages for:', { subject: baseSubject, classLevel, viewType });

      // First get the profiles data
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .order('created_at', { ascending: true });

      // Create a map for quick profile lookups
      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      // Then get the messages
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('subject', baseSubject)
        .eq('class_level', classLevel)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`);

      // For student view, only show their own messages
      if (viewType === 'student') {
        query = query.eq('student_id', user.id);
      }

      const { data: messages, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      // Filter messages by search term and add profile data
      const filteredMessages = (messages || [])
        .filter(msg => {
          // For teacher view, exclude their own messages
          if (viewType === 'teacher' && msg.student_id === user.id) {
            return false;
          }
          return searchTerm ? msg.content.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        })
        .map(msg => ({
          ...msg,
          student: profileMap.get(msg.student_id)
        }));

      // Group messages by date and conversation
      const groupedByDate = filteredMessages.reduce((acc, msg) => {
        const date = new Date(msg.created_at).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        return acc;
      }, {} as ConversationsByDate);

      // Group messages into conversations for each date
      Object.keys(groupedByDate).forEach(date => {
        const dateMessages = filteredMessages.filter(msg => 
          new Date(msg.created_at).toLocaleDateString() === date
        );
        groupedByDate[date] = groupMessagesByConversation(dateMessages);
      });

      setConversations(groupedByDate);
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversationHistory();
  }, [subject, classLevel, dateRange, searchTerm, viewType]);

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleConversationExpansion = (conversationId: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {viewType === 'teacher' ? 'Historique des élèves' : 'Mon historique'} - {subject}
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
                  placeholder="Rechercher dans les conversations..."
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
              {Object.entries(conversations)
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                .map(([date, dateConversations]) => (
                  <div key={date} className="border rounded-lg">
                    <button
                      onClick={() => toggleDateExpansion(date)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 rounded-t-lg hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        {expandedDates.has(date) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">{date}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {dateConversations.length} conversation{dateConversations.length > 1 ? 's' : ''}
                      </span>
                    </button>

                    {expandedDates.has(date) && (
                      <div className="p-4 space-y-4">
                        {dateConversations.map((conversation) => (
                          <div key={conversation.id} className="border rounded-lg">
                            <button
                              onClick={() => toggleConversationExpansion(conversation.id)}
                              className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
                            >
                              <div className="flex items-center gap-4">
                                {expandedConversations.has(conversation.id) ? (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                                {viewType === 'teacher' && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium">
                                      {conversation.studentName || conversation.studentEmail}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">
                                    {new Date(conversation.startTime).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">
                                    {conversation.messageCount} message{conversation.messageCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                                {conversation.resourcePath && (
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm text-blue-500">
                                      Document PDF
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>

                            {expandedConversations.has(conversation.id) && (
                              <div className="p-4 space-y-4">
                                {conversation.messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`p-4 rounded-lg ${
                                      message.role === 'assistant'
                                        ? 'bg-blue-50 ml-4'
                                        : 'bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <User className={`w-4 h-4 ${
                                          message.role === 'assistant' ? 'text-blue-500' : 'text-gray-500'
                                        }`} />
                                        <span className="text-sm font-medium">
                                          {message.role === 'assistant' ? 'Assistant' : (
                                            viewType === 'teacher' 
                                              ? message.student?.display_name || message.student?.email
                                              : 'Moi'
                                          )}
                                        </span>
                                      </div>
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