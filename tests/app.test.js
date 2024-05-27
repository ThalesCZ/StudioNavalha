const { SignUpWithEmailAndPassword, SignInWithEmailAndPassword } = require('../firebase');

describe('Firebase Auth', () => {
  test('should sign up a user with email and password', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = await SignUpWithEmailAndPassword(email, password);
    expect(user).toHaveProperty('email', email);
  });

  test('should sign in a user with email and password', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const user = await SignInWithEmailAndPassword(email, password);
    expect(user).toHaveProperty('email', email);
  });
});
