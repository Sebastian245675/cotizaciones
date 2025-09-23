// Firebase mock para Electron - Evita errores de dependencias
// Este archivo reemplaza firebase.js cuando la aplicación se ejecuta en Electron

console.log('🔥 Firebase Mock: Inicializado para aplicación Electron');

// Mock de Firebase Admin
const mockAdmin = {
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        set: () => Promise.resolve(),
        get: () => Promise.resolve({ exists: false, data: () => null }),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      add: () => Promise.resolve({ id: 'mock-id' }),
      get: () => Promise.resolve({ docs: [], empty: true })
    })
  }),
  auth: () => ({
    getUser: () => Promise.resolve({ uid: 'mock-uid', email: 'mock@email.com' }),
    createUser: () => Promise.resolve({ uid: 'mock-uid' })
  })
};

// Mock de Firebase Client
const mockDb = {
  collection: () => ({
    doc: () => ({
      set: () => Promise.resolve(),
      get: () => Promise.resolve({ exists: false, data: () => null }),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    }),
    add: () => Promise.resolve({ id: 'mock-id' }),
    get: () => Promise.resolve({ docs: [], empty: true })
  })
};

// Mock de Firebase Auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'mock-uid' } }),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: { uid: 'mock-uid' } }),
  signOut: () => Promise.resolve(),
  onAuthStateChanged: () => () => {} // Unsubscribe function
};

// Exportar mocks
module.exports = {
  // Admin SDK
  admin: mockAdmin,
  
  // Client SDK  
  db: mockDb,
  auth: mockAuth,
  
  // Firestore functions mock
  collection: () => mockDb.collection(),
  addDoc: () => Promise.resolve({ id: 'mock-id' }),
  updateDoc: () => Promise.resolve(),
  deleteDoc: () => Promise.resolve(),
  doc: () => mockDb.collection().doc(),
  getDocs: () => Promise.resolve({ docs: [], empty: true }),
  
  // Status
  isAvailable: false,
  isElectron: true,
  
  // Logging
  log: (message) => console.log(`🔥 Firebase Mock: ${message}`)
};

console.log('✅ Firebase Mock: Todas las dependencias Firebase han sido mockeadas exitosamente');