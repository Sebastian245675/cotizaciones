import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'file';
  required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

interface QuoteForm {
  id: string;
  name: string;
  description: string;
  fields: QuoteField[];
  active: boolean;
  createdAt: Date;
}

interface QuoteSubmission {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  status: 'pending' | 'reviewed' | 'responded' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
}

export const useQuotes = () => {
  const [quoteForms, setQuoteForms] = useState<QuoteForm[]>([]);
  const [quoteSubmissions, setQuoteSubmissions] = useState<QuoteSubmission[]>([]);
  const [activeForms, setActiveForms] = useState<QuoteForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuoteForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const formsSnapshot = await getDocs(query(collection(db, 'quoteForms'), orderBy('createdAt', 'desc')));
      const forms = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as QuoteForm[];
      
      setQuoteForms(forms);
      setActiveForms(forms.filter(form => form.active));
    } catch (err) {
      console.error('Error loading quote forms:', err);
      setError('Error al cargar los formularios de cotización');
    } finally {
      setLoading(false);
    }
  };

  const loadQuoteSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const submissionsSnapshot = await getDocs(query(collection(db, 'quoteSubmissions'), orderBy('createdAt', 'desc')));
      const submissions = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as QuoteSubmission[];
      
      setQuoteSubmissions(submissions);
    } catch (err) {
      console.error('Error loading quote submissions:', err);
      setError('Error al cargar las cotizaciones enviadas');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveFormsOnly = async () => {
    setLoading(true);
    setError(null);
    try {
      const formsQuery = query(
        collection(db, 'quoteForms'), 
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
      const formsSnapshot = await getDocs(formsQuery);
      const forms = formsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as QuoteForm[];
      
      setActiveForms(forms);
    } catch (err) {
      console.error('Error loading active quote forms:', err);
      setError('Error al cargar los formularios activos');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await Promise.all([loadQuoteForms(), loadQuoteSubmissions()]);
  };

  // Estadísticas útiles
  const getStats = () => {
    const totalForms = quoteForms.length;
    const activeForms = quoteForms.filter(form => form.active).length;
    const totalSubmissions = quoteSubmissions.length;
    const pendingSubmissions = quoteSubmissions.filter(sub => sub.status === 'pending').length;
    const respondedSubmissions = quoteSubmissions.filter(sub => sub.status === 'responded').length;

    return {
      totalForms,
      activeForms,
      totalSubmissions,
      pendingSubmissions,
      respondedSubmissions
    };
  };

  // Filtros útiles
  const getSubmissionsByStatus = (status: QuoteSubmission['status']) => {
    return quoteSubmissions.filter(submission => submission.status === status);
  };

  const getSubmissionsByForm = (formId: string) => {
    return quoteSubmissions.filter(submission => submission.formId === formId);
  };

  const getRecentSubmissions = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return quoteSubmissions.filter(submission => 
      submission.createdAt >= cutoffDate
    );
  };

  return {
    // Data
    quoteForms,
    quoteSubmissions,
    activeForms,
    
    // State
    loading,
    error,
    
    // Actions
    loadQuoteForms,
    loadQuoteSubmissions,
    loadActiveFormsOnly,
    refreshData,
    
    // Utilities
    getStats,
    getSubmissionsByStatus,
    getSubmissionsByForm,
    getRecentSubmissions
  };
};

export default useQuotes;
