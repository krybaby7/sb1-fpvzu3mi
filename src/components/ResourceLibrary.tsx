import React, { useState, useEffect } from 'react';
import { Upload, Trash2, FileText, Plus, X, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChatInterface } from './ChatInterface';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ResourceLibraryProps {
  subject: string;
  classLevel: string;
  isTeacher: boolean;
  onClose: () => void;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  file_path: string;
  created_at: string;
  uploaded_by: string;
  extracted_text?: string;
}

function generateSafeFilePath(originalName: string, subject: string, classLevel: string): string {
  const cleanSubject = subject.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const cleanClass = classLevel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const cleanName = originalName.toLowerCase().replace(/[^a-z0-9.]/g, '_').replace(/_+/g, '_');
  return `${cleanSubject}/${cleanClass}/${Date.now()}_${cleanName}`;
}

export function ResourceLibrary({ subject, classLevel, isTeacher, onClose }: ResourceLibraryProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedResourceForSummary, setSelectedResourceForSummary] = useState<Resource | null>(null);

  useEffect(() => {
    loadResources();

    const channel = supabase
      .channel('resources')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'resources',
          filter: `subject=eq.${subject}`
        },
        () => loadResources()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [subject, classLevel]);

  async function loadResources() {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('subject', subject)
        .eq('class_level', classLevel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
      alert('Failed to load resources: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async function extractTextFromPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item: any) => item.str).join(' ');
      }
      
      return extractedText;
    } catch (error) {
      console.error("PDF processing error:", error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('La taille du fichier ne doit pas dépasser 50MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const filePath = generateSafeFilePath(file.name, subject, classLevel);
      console.log('Generated file path:', filePath);

      const extractedText = await extractTextFromPDF(file);

      const { error: uploadError } = await supabase.storage
        .from('resource-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('resources')
        .insert({
          name: file.name,
          description: description,
          file_path: filePath,
          subject: subject,
          class_level: classLevel,
          uploaded_by: user.id,
          extracted_text: extractedText
        });
      if (dbError) throw dbError;

      await loadResources();
      setShowUploadModal(false);
      setDescription('');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(resource: Resource) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || resource.uploaded_by !== user.id) {
        throw new Error('Unauthorized operation');
      }

      const { error: storageError } = await supabase.storage
        .from('resource-files')
        .remove([resource.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id);
      if (dbError) throw dbError;

      await loadResources();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Erreur de suppression');
    }
  }

  function handleDownload(resource: Resource) {
    const { data } = supabase.storage
      .from('resource-files')
      .getPublicUrl(resource.file_path);
    window.open(data.publicUrl, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Ressources - {subject} ({classLevel})
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isTeacher && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full mb-4 p-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une ressource
            </button>
          )}

          <div className="space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-800">{resource.name}</h3>
                    {resource.description && (
                      <p className="text-sm text-gray-600">{resource.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedResourceForSummary(resource)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Résumé et questions"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(resource)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(resource)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {resources.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Aucune ressource disponible
              </div>
            )}
          </div>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Ajouter une ressource</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    placeholder="Description de la ressource..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="w-full"
                    disabled={isUploading}
                  />
                  {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  disabled={isUploading}
                >
                  Annuler
                </button>
                <button
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Traitement en cours...' : 'Télécharger le PDF'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedResourceForSummary && (
          <ChatInterface
            subject={subject}
            onClose={() => setSelectedResourceForSummary(null)}
            initialMessage={`Pouvez-vous me faire un résumé du document "${selectedResourceForSummary.name}" ?`}
            resourcePath={selectedResourceForSummary.file_path}
            isTeacher={isTeacher}
          />
        )}
      </div>
    </div>
  );
}