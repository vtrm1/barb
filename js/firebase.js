// Responsável por inicializar o Firebase em todas as páginas.
// Substitua os valores do objeto firebaseConfig pelos dados reais do projeto.
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:abcdefghijk"
};

// Garante que o app não seja inicializado duas vezes.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta instâncias utilizadas nos demais arquivos.
const db = firebase.firestore();
const auth = firebase.auth();
