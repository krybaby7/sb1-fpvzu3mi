import React, { useState } from 'react';
import { BookOpen, Calculator, Beaker, Globe, FlaskConical, TrendingUp, MessageSquareMore, ChevronDown, BookOpenCheck, Users, User } from 'lucide-react';
import { ChatInterface } from './ChatInterface';
import { ResourceLibrary } from './ResourceLibrary';
import { ConversationHistory } from './ConversationHistory';

const CLASS_LEVELS = ['6e', '5e', '4e', '3e', '2nde'] as const;
type ClassLevel = typeof CLASS_LEVELS[number];

interface TeacherDashboardProps {
  onSignOut?: () => void;
}

const getSubjects = (level: ClassLevel) => {
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

export function TeacherDashboard({ onSignOut }: TeacherDashboardProps) {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>('2nde');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showResources, setShowResources] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStudentHistory, setShowStudentHistory] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const subjects = getSubjects(selectedClass);

  const handleResourceClick = (subject: string) => {
    setSelectedSubject(subject);
    setShowResources(true);
    setShowHistory(false);
    setShowStudentHistory(false);
  };

  const handleAssistantClick = (subject: string) => {
    setSelectedSubject(`Enseignant ${subject}`);
    setShowResources(false);
    setShowHistory(false);
    setShowStudentHistory(false);
  };

  const handleHistoryClick = (subject: string, type: 'teacher' | 'student') => {
    setSelectedSubject(subject);
    if (type === 'teacher') {
      setShowHistory(true);
      setShowStudentHistory(false);
    } else {
      setShowHistory(false);
      setShowStudentHistory(true);
    }
    setShowResources(false);
  };

  const handleCloseModal = () => {
    setSelectedSubject(null);
    setShowResources(false);
    setShowHistory(false);
    setShowStudentHistory(false);
  };

  const handleClassChange = (level: ClassLevel) => {
    setSelectedClass(level);
    setSelectedSubject(null);
    setShowResources(false);
    setShowHistory(false);
    setShowStudentHistory(false);
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">
            Tableau de bord Enseignant
          </h1>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
            >
              <span>Classe: {selectedClass}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                {CLASS_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => handleClassChange(level)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <div className="flex gap-2 mt-2 w-full justify-center">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                      onClick={() => handleHistoryClick(subject.name, 'teacher')}
                    >
                      <User className="w-5 h-5 text-purple-600" />
                      <span className="text-purple-600">Mon historique</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                      onClick={() => handleHistoryClick(subject.name, 'student')}
                    >
                      <Users className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-600">Historique élèves</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Modals */}
      {selectedSubject && (showHistory || showStudentHistory) && (
        <ConversationHistory
          subject={selectedSubject}
          classLevel={selectedClass}
          viewType={showHistory ? 'teacher' : 'student'}
          onClose={handleCloseModal}
        />
      )}

      {/* Chat Interface Modal */}
      {selectedSubject && !showResources && !showHistory && !showStudentHistory && (
        <ChatInterface
          subject={selectedSubject}
          onClose={handleCloseModal}
          isTeacher={true}
        />
      )}

      {/* Resource Library Modal */}
      {selectedSubject && showResources && (
        <ResourceLibrary
          subject={selectedSubject}
          classLevel={selectedClass}
          isTeacher={true}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}