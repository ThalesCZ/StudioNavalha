const { MockFirebase, MockFirebaseSdk } = require('firebase-mock');

// Configurando mocks para auth e database
const mockAuth = new MockFirebase();
const mockDatabase = new MockFirebase();

const mocksdk = new MockFirebaseSdk(
  (path) => {
    return path ? mockDatabase.child(path) : mockDatabase;
  },
  () => {
    return mockAuth;
  }
);

// Habilita o autoFlush para simular automaticamente a resolução das operações assíncronas
mockAuth.autoFlush();
mockDatabase.autoFlush();

// Mock do Firebase usado no seu projeto
jest.mock('firebase', () => {
  return {
    initializeApp: () => mocksdk,
    auth: () => mockAuth,
    database: () => mockDatabase,
  };
});
