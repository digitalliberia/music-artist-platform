import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    });
}

// Signup
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Create user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email: email,
                createdAt: new Date()
            });
            window.location.href = 'profile.html';
        } catch (error) {
            alert('Signup failed: ' + error.message);
        }
    });
}

// Check auth state
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname === '/index.html') {
        window.location.href = 'dashboard.html';
    }
});
