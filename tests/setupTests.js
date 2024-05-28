const mockFirebase = require('firebase-mock');
const mockAuth = new mockFirebase.MockFirebase();
const mockDatabase = new mockFirebase.MockFirebase();

const mocksdk = new mockFirebase.MockFirebaseSdk(
  (path) => {
    return path ? mockDatabase.child(path) : mockDatabase;
  },
  () => {
    return mockAuth;
  }
);

mocksdk.auth().autoFlush(); // Simula operações assíncronas de auth

jest.mock('firebase', () => {
  return mocksdk;
});

// Adicionar um usuário mock para retornar ao chamar createUserWithEmailAndPassword
mockAuth.createUserWithEmailAndPassword = jest.fn((email, password) => {
  return Promise.resolve({
    user: {
      email,
      uid: '12345'
    }
  });
});
