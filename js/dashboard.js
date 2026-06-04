import { auth, db, storage } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const loadDashboard = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // Load artist profile
    const artistRef = doc(db, 'artists', userId);
    const artistDoc = await getDoc(artistRef);
    if (artistDoc.exists()) {
        document.getElementById('userEmail').textContent = artistDoc.data().artistName || auth.currentUser.email;
    } else {
        document.getElementById('userEmail').textContent = auth.currentUser.email;
    }
    
    // Load tracks
    const tracksQuery = query(collection(db, 'tracks'), where('artistId', '==', userId));
    const tracksSnapshot = await getDocs(tracksQuery);
    const tracks = [];
    
    tracksSnapshot.forEach((doc) => {
        tracks.push({ id: doc.id, ...doc.data() });
    });
    
    document.getElementById('totalTracks').textContent = tracks.length;
    
    // Display tracks with delete buttons
    const musicLibrary = document.getElementById('musicLibrary');
    musicLibrary.innerHTML = '';
    
    if (tracks.length === 0) {
        musicLibrary.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No tracks uploaded yet. Click "Upload Music" to get started!</p></div>';
        return;
    }
    
    for (const track of tracks) {
        let audioUrl = '';
        try {
            const audioRef = ref(storage, track.audioUrl);
            audioUrl = await getDownloadURL(audioRef);
        } catch (e) {
            console.error('Error getting audio URL:', e);
        }
        
        const trackCard = `
            <div class="col-md-6 col-lg-4">
                <div class="music-card">
                    ${track.coverUrl ? `<img src="${track.coverUrl}" class="card-img-top" alt="Cover art">` : '<div class="card-img-top bg-gradient text-center p-5"><i class="fas fa-music fa-3x"></i></div>'}
                    <div class="music-info">
                        <h5>${track.title}</h5>
                        <p class="text-muted">${track.duration} seconds</p>
                        <small>Uploaded: ${new Date(track.uploadedAt?.toDate()).toLocaleDateString()}</small>
                        <br>
                        <audio controls class="mt-2" style="width: 100%">
                            <source src="${audioUrl}" type="audio/mpeg">
                            Your browser does not support the audio element.
                        </audio>
                        <button class="btn btn-danger btn-sm mt-3 w-100 delete-track" data-id="${track.id}" data-audio="${track.audioUrl}">
                            <i class="fas fa-trash"></i> Delete Track
                        </button>
                    </div>
                </div>
            </div>
        `;
        musicLibrary.innerHTML += trackCard;
    }
    
    // Add delete event listeners
    document.querySelectorAll('.delete-track').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const trackId = btn.getAttribute('data-id');
            const audioPath = btn.getAttribute('data-audio');
            if (confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
                try {
                    // Delete from Firestore
                    await deleteDoc(doc(db, 'tracks', trackId));
                    
                    // Delete from Storage
                    const audioRef = ref(storage, audioPath);
                    await deleteObject(audioRef);
                    
                    alert('Track deleted successfully!');
                    location.reload(); // Refresh the page
                } catch (error) {
                    alert('Error deleting track: ' + error.message);
                }
            }
        });
    });
};

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut();
    window.location.href = 'index.html';
});

auth.onAuthStateChanged((user) => {
    if (user) {
        loadDashboard();
    } else {
        window.location.href = 'index.html';
    }
});
