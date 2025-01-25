import { Subject } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';

const DEEPSEEK_API_KEY = 'sk-410189fd264d4d5f945f79a30f3b3daa';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.js',
  import.meta.url
).toString();

const getSubjectPrompt = (subject: string) => {
  const basePrompt = `Vous êtes un assistant pédagogique spécialisé en ${subject}. Instructions importantes:
1. Répondez TOUJOURS en français, sauf si on vous demande explicitement une explication dans une autre langue.
2. Adaptez votre langage au niveau de l'élève.
3. Utilisez un ton encourageant et pédagogique.
4. Structurez vos réponses clairement avec des titres, listes, et tableaux quand c'est pertinent.
5. Corrigez poliment les erreurs si nécessaire.
6. Donnez toujours des exemples concrets.
7. Encouragez la pratique active.
8. N'hésitez pas à utiliser des tableaux markdown pour présenter des informations structurées.
9. Posez TOUJOURS des questions a la fin de vos réponses pour encourager la conversation sur le sujet.
10. Ne discuter que des sujets liés à ${subject}`;

  if (subject.includes('Français')) {
    return `${basePrompt}\n- Ne jamais traduire le contenu dans d'autres langues car il s'agit d'un cours de français`;
  }

  return basePrompt;
};

async function fetchPDFContent(path: string): Promise<string> {
  try {
    // Get the file URL
    const { data: urlData } = await supabase.storage
      .from('resource-files')
      .createSignedUrl(path, 60); // 60 seconds expiry

    if (!urlData?.signedUrl) {
      throw new Error('Unable to generate signed URL for PDF');
    }

    // Fetch the PDF file
    const response = await fetch(urlData.signedUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => item.str.trim().length > 0) // Filter out empty strings
          .map((item: any) => item.str)
          .join(' ');

        if (pageText.trim()) {
          fullText += pageText + '\n\n';
        }
      } catch (pageError) {
        console.warn(`Error processing page ${i}:`, pageError);
        continue; // Continue with the next page if one fails
      }
    }

    if (!fullText.trim()) {
      throw new Error('No text content found in PDF');
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error processing PDF:', error);
    if (error instanceof Error) {
      throw new Error(`Erreur lors du traitement du PDF: ${error.message}`);
    }
    throw new Error('Erreur lors du traitement du PDF');
  }
}

export async function chatWithDeepseek(
  subject: string,
  message: string,
  resourcePath?: string
) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for PDF processing

    let fullMessage = message;
    if (resourcePath) {
      try {
        const pdfContent = await fetchPDFContent(resourcePath);
        if (pdfContent) {
          fullMessage = `Contenu du document PDF:\n\n${pdfContent}\n\nQuestion de l'utilisateur:\n${message}`;
        }
      } catch (error) {
        console.error('Error processing PDF:', error);
        fullMessage = `Note: Je n'ai pas pu accéder au contenu complet du document PDF en raison d'une erreur technique. Je vais essayer de répondre à votre question avec les informations disponibles.\n\nQuestion originale:\n${message}`;
      }
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: getSubjectPrompt(subject) },
          { role: 'user', content: fullMessage },
        ],
        temperature: 1.2,
        max_tokens: 3000,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
        stream: false,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || 'Failed to get a response from Deepseek API'
      );
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Deepseek API');
    }
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps. Veuillez réessayer.');
    }
    console.error('Deepseek API Error:', error);
    throw new Error(
      "Une erreur est survenue lors de la communication avec l'assistant. Veuillez réessayer."
    );
  }
}
