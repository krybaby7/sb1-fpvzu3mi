import React, { useState } from 'react';
import { GraduationCap, School } from 'lucide-react';
import { AuthForm } from './components/AuthForm';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { supabase } from './lib/supabase';

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);
  const [user, setUser] = useState(supabase.auth.getUser());
  const [classLevel, setClassLevel] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);

  React.useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session);
        setClassLevel(session.user.user_metadata.classLevel);
        setUserRole(session.user.user_metadata.role);
      } else {
        setUser(null);
        setClassLevel(null);
        setUserRole(null);
      }
    });
  }, []);

  const handleAuth = (role: 'student' | 'teacher') => {
    setSelectedRole(role);
    setShowAuth(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // If user is logged in, show appropriate dashboard
  if (user) {
    return (
      <>
        <button
          onClick={handleSignOut}
          className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Se déconnecter
        </button>
        {userRole === 'teacher' ? (
          <TeacherDashboard />
        ) : (
          <StudentDashboard classLevel={classLevel || ''} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">
            Bienvenue à l'École Numérique
          </h1>
          <p className="text-lg text-blue-700">
            Choisissez votre type de compte pour continuer
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Student Card */}
          <button
            onClick={() => handleAuth('student')}
            className="bg-white rounded-xl shadow-lg p-8 transition-transform hover:scale-105 hover:shadow-xl group"
          >
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 p-4 rounded-full mb-6 group-hover:bg-blue-200 transition-colors">
                <GraduationCap className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-blue-900 mb-2">
                Élève
              </h2>
              <p className="text-blue-600 text-center">
                Accédez à votre espace d'apprentissage
              </p>
            </div>
          </button>

          {/* Teacher Card */}
          <button
            onClick={() => handleAuth('teacher')}
            className="bg-white rounded-xl shadow-lg p-8 transition-transform hover:scale-105 hover:shadow-xl group"
          >
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 p-4 rounded-full mb-6 group-hover:bg-blue-200 transition-colors">
                <School className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-blue-900 mb-2">
                Enseignant
              </h2>
              <p className="text-blue-600 text-center">
                Gérez vos classes et ressources
              </p>
            </div>
          </button>
        </div>

        <footer className="text-center mt-12 text-blue-600">
          <p>© 2024 École Numérique. Tous droits réservés.</p>
        </footer>
      </div>

      {showAuth && selectedRole && (
        <AuthForm
          role={selectedRole}
          onClose={() => {
            setShowAuth(false);
            setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
}

export default App;