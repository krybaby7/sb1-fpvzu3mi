import React, { useState } from 'react';
import { BookOpen, Calculator, Beaker, Globe, FlaskConical, TrendingUp, BookOpenCheck, MessageSquareMore, History } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { ResourceLibrary } from './ResourceLibrary';
import { ConversationHistory } from './ConversationHistory';

interface StudentDashboardProps {
  classLevel: string;
}

export function StudentDashboard({ classLevel }: StudentDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showResources, setShowResources] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const getSubjects = (level: string) => {
    switch (level) {
      case '2nde':
        return [
          { name: 'Français 2nde', icon: BookOpen, color: 'text-blue-600' },
          { name: 'SVT 2nde', icon: Beaker, color: 'text-green-600' },
          { name: 'Physique-Chimie 2nde', icon: FlaskConical, color: 'text-red-600' },
          { name: 'Maths 2nde', icon: Calculator, color: 'text-purple-600' },
          { name: 'Histoire-Géo 2nde', icon: Globe, color: 'text-orange-600' },
          { name: 'SES 2nde', icon: TrendingUp, color: 'text-pink-600' }
        ];
      case '3e':
      case '4e':
      case '5e':
        return [
          { name: `Français ${level}`, icon: BookOpen, color: 'text-blue-600' },
          { name: `SVT ${level}`, icon: Beaker, color: 'text-green-600' },
          { name: `Physique-Chimie ${level}`, icon: FlaskConical, color: 'text-red-600' },
          { name: `Maths ${level}`, icon: Calculator, color: 'text-purple-600' },
          { name: `Histoire-Géo ${level}`, icon: Globe, color: 'text-orange-600' }
        ];
      case '6e':
        return [
          { name: 'Français 6e', icon: BookOpen, color: 'text-blue-600' },
          { name: 'Sciences 6e', icon: Beaker, color: 'text-green-600' },
          { name: 'Maths 6e', icon: Calculator, color: 'text-purple-600' },
          { name: 'Histoire-Géo 6e', icon: Globe, color: 'text-orange-600' }
        ];
      default:
        return [];
    }
  };

  const subjects = getSubjects(classLevel);

  const handleResourceClick = (subject: string) => {
    setSelectedSubject(subject);
    setShowResources(true);
    setShowHistory(false);
  };

  const handleAssistantClick = (subject: string) => {
    setSelectedSubject(subject);
    setShowResources(false);
    setShowHistory(false);
  };

  const handleHistoryClick = (subject: string) => {
    setSelectedSubject(subject);
    setShowHistory(true);
    setShowResources(false);
  };

  const handleCloseModal = () => {
    setSelectedSubject(null);
    setShowResources(false);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-8">
          Tableau de bord - {classLevel}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            return (
              <div
                key={subject.name}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex flex-col items-center mb-4">
                  <div className={`p-4 rounded-full bg-gray-50 ${subject.color}`}>
                    <Icon className="w-12 h-12" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-gray-800 text-center">
                    {subject.name}
                  </h2>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                    onClick={() => handleResourceClick(subject.name)}
                  >
                    <BookOpenCheck className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-600">Ressources</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                    onClick={() => handleAssistantClick(subject.name)}
                  >
                    <MessageSquareMore className="w-5 h-5 text-green-600" />
                    <span className="text-green-600">Assistant</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                    onClick={() => handleHistoryClick(subject.name)}
                  >
                    <History className="w-5 h-5 text-purple-600" />
                    <span className="text-purple-600">Historique</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSubject && !showResources && !showHistory && (
        <ChatInterface
          subject={selectedSubject}
          onClose={handleCloseModal}
          isTeacher={false}
        />
      )}

      {selectedSubject && showResources && (
        <ResourceLibrary
          subject={selectedSubject}
          classLevel={classLevel}
          isTeacher={false}
          onClose={handleCloseModal}
        />
      )}

      {selectedSubject && showHistory && (
        <ConversationHistory
          subject={selectedSubject}
          classLevel={classLevel}
          viewType="student"
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}