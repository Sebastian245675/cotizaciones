// Use the Firebase app that's already initialized in the main firebase.ts file
// No need to initialize Firebase again here

import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, addDoc, DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { simulatedDB } from './simulatedDB';

// Wrapper para acceder a documentos y colecciones con fallback a la DB simulada

// Obtener una colección completa
export async function getCollection(collectionName: string) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error al obtener colección ${collectionName}:`, error);
    // Fallback a la base de datos simulada
    return simulatedDB.getCollectionData(collectionName);
  }
}

// Obtener un documento por ID
export async function getDocumentById(collectionName: string, docId: string) {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnapshot = await getDoc(docRef);
    
    if (docSnapshot.exists()) {
      return {
        id: docSnapshot.id,
        ...docSnapshot.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error al obtener documento ${collectionName}/${docId}:`, error);
    // Fallback a la base de datos simulada
    return simulatedDB.getDocumentData(collectionName, docId);
  }
}

// Consulta filtrada por campo
export async function queryCollection(collectionName: string, fieldName: string, value: any) {
  try {
    const q = query(collection(db, collectionName), where(fieldName, '==', value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error en consulta a ${collectionName} donde ${fieldName}=${value}:`, error);
    // Fallback: filtrar manualmente en la DB simulada
    const allDocs = await simulatedDB.getCollectionData(collectionName);
    return allDocs.filter(doc => doc[fieldName] === value);
  }
}

// Crear un nuevo documento con ID personalizado
export async function createDocumentWithId(collectionName: string, docId: string, data: any) {
  try {
    await setDoc(doc(db, collectionName, docId), data);
    return { id: docId, ...data };
  } catch (error) {
    console.error(`Error al crear documento ${collectionName}/${docId}:`, error);
    // Crear en la DB simulada
    await simulatedDB.addDocumentData(collectionName, docId, data);
    return { id: docId, ...data };
  }
}

// Crear un documento con ID automático
export async function createDocument(collectionName: string, data: any) {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error(`Error al crear documento en ${collectionName}:`, error);
    // Crear en la DB simulada con ID generado
    const id = `simulated-${Date.now()}`;
    await simulatedDB.addDocumentData(collectionName, id, data);
    return { id, ...data };
  }
}

// Actualizar un documento
export async function updateDocument(collectionName: string, docId: string, data: any) {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error(`Error al actualizar documento ${collectionName}/${docId}:`, error);
    // Actualizar en la DB simulada
    await simulatedDB.updateDocumentData(collectionName, docId, data);
    return true;
  }
}

// Eliminar un documento
export async function deleteDocument(collectionName: string, docId: string) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (error) {
    console.error(`Error al eliminar documento ${collectionName}/${docId}:`, error);
    // Eliminar en la DB simulada
    await simulatedDB.deleteDocumentData(collectionName, docId);
    return true;
  }
}
