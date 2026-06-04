import { auth, db, storage } from './firebase-config.js';
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const uploadForm = document.getElementById('uploadForm');
const progressBar = document.getElementById('uploadProgress');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = auth.currentUser?.uid;
    if (!userId) {
        alert('Please login first');
        return;
    }
    
    const title = document.getElementById('trackTitle').value;
    const audioFile = document.getElementById('audioFile').files[0];
    const coverFile = document.getElementById('coverArt').files[0];
    const duration = document.getElementById('duration').value;
    
    if (!audioFile) {
        alert('Please select an audio file');
        return;
    }
    
    // Show progress bar
    progressBar.classList.remove('d-none');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    
    // Upload audio to Firebase Storage
    const timestamp = Date.now();
    const audioPath = `tracks/${userId}/${timestamp}_${audioFile.name}`;
    const audioRef = ref(storage, audioPath);
    const uploadTask = uploadBytesResumable(audioRef, audioFile);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBarInner.style.width = progress + '%';
        },
        (error) => {
            alert('Upload failed: ' + error.message);
            progressBar.classList.add('d-none');
        },
        async () => {
            const audioUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            let coverUrl = '';
            if (coverFile) {
                const coverPath = `covers/${userId}/${timestamp}_${coverFile.name}`;
                const coverRef = ref(storage, coverPath);
                const coverUpload = await uploadBytesResumable(coverRef, coverFile);
                coverUrl = await getDownloadURL(coverUpload.ref);
            }
            
            // Save to Firestore
            await addDoc(collection(db, 'tracks'), {
                title: title,
                artistId: userId,
                audioUrl: audioPath,
                coverUrl: coverUrl || '',
                duration: parseInt(duration),
                uploadedAt: serverTimestamp(),
                streams: 0
            });
            
            alert('Track uploaded successfully!');
            progressBar.classList.add('d-none');
            uploadForm.reset();
        }
    );
});

// Auth check
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut();
    window.location.href = 'index.html';
});
