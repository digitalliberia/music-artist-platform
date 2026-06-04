import { auth, db, storage } from './firebase-config.js';
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const uploadForm = document.getElementById('uploadForm');
const progressBar = document.getElementById('uploadProgress');
const uploadMessage = document.getElementById('uploadMessage');

const showMessage = (message, isError = false) => {
    uploadMessage.textContent = message;
    uploadMessage.className = `alert ${isError ? 'alert-danger' : 'alert-success'} show`;
    setTimeout(() => {
        uploadMessage.classList.add('d-none');
    }, 5000);
};

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = auth.currentUser?.uid;
    if (!userId) {
        showMessage('Please login first', true);
        return;
    }
    
    const title = document.getElementById('trackTitle').value;
    const audioFile = document.getElementById('audioFile').files[0];
    const coverFile = document.getElementById('coverArt').files[0];
    const duration = document.getElementById('duration').value;
    
    if (!audioFile) {
        showMessage('Please select an audio or video file', true);
        return;
    }
    
    // Validate file size (50MB max)
    if (audioFile.size > 50 * 1024 * 1024) {
        showMessage('File too large! Maximum size is 50MB', true);
        return;
    }
    
    // Show progress bar
    progressBar.classList.remove('d-none');
    const progressBarInner = progressBar.querySelector('.progress-bar');
    
    // Upload audio/video to Firebase Storage
    const timestamp = Date.now();
    const fileExtension = audioFile.name.split('.').pop();
    const audioPath = `tracks/${userId}/${timestamp}_${title.replace(/[^a-z0-9]/gi, '_')}.${fileExtension}`;
    const audioRef = ref(storage, audioPath);
    const uploadTask = uploadBytesResumable(audioRef, audioFile);
    
    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBarInner.style.width = progress + '%';
        },
        (error) => {
            showMessage('Upload failed: ' + error.message, true);
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
                streams: 0,
                fileType: audioFile.type
            });
            
            showMessage('Track uploaded successfully!');
            progressBar.classList.add('d-none');
            uploadForm.reset();
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    );
});

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut();
    window.location.href = 'index.html';
});
