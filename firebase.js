  const firebase = require('firebase');

  var config = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    databaseURL: process.env.DATABASE_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID
  };

  firebase.initializeApp(config);

  module.exports.SignUpWithEmailAndPassword = (email, password) => {
    return firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        return JSON.stringify(userCredential.user);
      })
      .catch(function (error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == 'auth/weak-password') {
          return { err: 'auth/weak-password' };
        }
        else if (errorCode = 'auth/email-already-in-use') {
          return { err: 'auth/email-already-in-use' }
        }
        else {
          return { err: errorMessage };
        }
      });
  }

  module.exports.SignInWithEmailAndPassword = (email, password) => {
    return firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(function (error) {
        var errorCode = error.code;
        if (errorCode === 'auth/wrong-password') {
          throw new Error('auth/wrong-password');
        } else {
          throw new Error(error.message);
        }
      });
  }



  module.exports.GetData = () => {
    let data = []
    return firebase.database().ref('users').once('value')
      .then((snapshot) => {

        snapshot.forEach((childSnapshot) => {
          data.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          })
        })
        console.log(data)
        return data;
      })
  }

  module.exports.insertUserData = (userData) => {
    return firebase.database().ref('users/' + userData.uid).set({
      email: userData.email,
    });
  };


  return module.exports