import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  role: 'student' | 'teacher';
  onClose: () => void;
}

const TEACHER_EMAIL_DOMAIN = '@efssh.com';
const STUDENT_EMAIL_DOMAINS = [
  '@effsheleve6e.com',
  '@effsheleve5e.com',
  '@effsheleve4e.com',
  '@effsheleve3e.com',
  '@effsheleve2nde.com',
  '@effsheleve1ere.com',
  '@effsheleveterm.com'
];

export function AuthForm({ role, onClose }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const getClassLevel = (email: string): string | null => {
    const domain = email.substring(email.indexOf('@'));
    switch (domain) {
      case '@effsheleve6e.com': return '6e';
      case '@effsheleve5e.com': return '5e';
      case '@effsheleve4e.com': return '4e';
      case '@effsheleve3e.com': return '3e';
      case '@effsheleve2nde.com': return '2nde';
      case '@effsheleve1ere.com': return '1ere';
      case '@effsheleveterm.com': return 'terminale';
      default: return null;
    }
  };

  const validateEmailDomain = (email: string) => {
    if (role === 'teacher') {
      if (!email.endsWith(TEACHER_EMAIL_DOMAIN)) {
        throw new Error(`Les comptes enseignants doivent utiliser une adresse email se terminant par ${TEACHER_EMAIL_DOMAIN}`);
      }
    } else {
      const isValidStudentDomain = STUDENT_EMAIL_DOMAINS.some(domain => email.endsWith(domain));
      if (!isValidStudentDomain) {
        throw new Error(`Les comptes élèves doivent utiliser une adresse email correspondant à leur niveau de classe:\n${STUDENT_EMAIL_DOMAINS.join('\n')}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      validateEmailDomain(email);

      if (isSignUp) {
        const classLevel = role === 'student' ? getClassLevel(email) : null;
        const displayName = role === 'teacher' ? 'teacher1' : 'test1';

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              classLevel,
              displayName
            }
          }
        });

        if (signUpError) throw signUpError;
        alert('Inscription réussie! Vous pouvez maintenant vous connecter.');
      } else {
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) throw signInError;
        
        // Verify user role matches the selected login type
        const userRole = user?.user_metadata?.role;
        if (userRole !== role) {
          throw new Error(
            role === 'student'
              ? 'Ce compte n\'est pas un compte élève. Veuillez utiliser le portail enseignant.'
              : 'Ce compte n\'est pas un compte enseignant. Veuillez utiliser le portail élève.'
          );
        }
        
        alert('Connexion réussie!');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const getEmailPlaceholder = () => {
    if (role === 'teacher') {
      return `exemple${TEACHER_EMAIL_DOMAIN}`;
    }
    return `exemple${STUDENT_EMAIL_DOMAINS[0]}`;
  };

  const getEmailHelperText = () => {
    if (role === 'teacher') {
      return `Utilisez votre adresse email enseignant (${TEACHER_EMAIL_DOMAIN})`;
    }
    return 'Utilisez votre adresse email élève correspondant à votre niveau de classe';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">
          {isSignUp 
            ? (role === 'student' ? 'Inscription Élève' : 'Inscription Enseignant')
            : (role === 'student' ? 'Connexion Élève' : 'Connexion Enseignant')
          }
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder={getEmailPlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              {getEmailHelperText()}
            </p>
            {role === 'student' && (
              <div className="mt-2 text-xs text-gray-500">
                Domaines autorisés:
                <ul className="list-disc list-inside mt-1">
                  {STUDENT_EMAIL_DOMAINS.map((domain) => (
                    <li key={domain}>{domain}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Chargement...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-blue-600 text-sm hover:underline mt-4"
          >
            {isSignUp 
              ? 'Déjà inscrit ? Connectez-vous'
              : 'Pas encore de compte ? Inscrivez-vous'
            }
          </button>
        </form>
      </div>
    </div>
  );
}