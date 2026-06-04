import { auth, db, storage } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Load profile picture in navbar
const loadProfilePicture = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
        try {
            const artistRef = doc(db, 'artists', userId);
            const artistDoc = await getDoc(artistRef);
            if (artistDoc.exists() && artistDoc.data().profilePictureUrl) {
                const navProfilePic = document.getElementById('navProfilePic');
                const navProfileIcon = document.getElementById('navProfileIcon');
                navProfilePic.src = artistDoc.data().profilePictureUrl;
                navProfilePic.style.display = 'block';
                navProfileIcon.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading profile picture:', error);
        }
    }
};

// Load dashboard data
const loadDashboard = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // Load artist profile and display name
    const artistRef = doc(db, 'artists', userId);
    const artistDoc = await getDoc(artistRef);
    if (artistDoc.exists()) {
        const artistData = artistDoc.data();
        document.getElementById('userEmail').textContent = artistData.artistName || auth.currentUser.email;
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
    
    // Calculate total streams (mock data for now)
    const totalStreams = tracks.reduce((sum, track) => sum + (track.streams || 0), 0);
    document.getElementById('totalStreams').textContent = totalStreams;
    
    // Mock data for listeners and earnings (can be enhanced later)
    document.getElementById('totalListeners').textContent = Math.floor(totalStreams * 0.7);
    document.getElementById('totalEarnings').textContent = `$${(totalStreams * 0.004).toFixed(2)}`;
    
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
                    ${track.coverUrl ? `<img src="${track.coverUrl}" class="card-img-top" alt="Cover art" style="height: 200px; object-fit: cover;">` : '<div class="card-img-top bg-gradient text-center p-5" style="background: linear-gradient(135deg, #667eea, #764ba2); height: 200px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-music fa-4x"></i></div>'}
                    <div class="music-info">
                        <h5>${escapeHtml(track.title)}</h5>
                        <p class="text-muted mb-1">Duration: ${track.duration} seconds</p>
                        <p class="text-muted small">Streams: ${track.streams || 0}</p>
                        <small>Uploaded: ${track.uploadedAt?.toDate ? new Date(track.uploadedAt.toDate()).toLocaleDateString() : 'Recent'}</small>
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

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut();
    window.location.href = 'index.html';
});

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadProfilePicture();
        await loadDashboard();
    } else {
        window.location.href = 'index.html';
    }
});

// Listen for profile updates from profile page
window.addEventListener('message', (event) => {
    if (event.data === 'profileUpdated') {
        loadProfilePicture();
        location.reload();
    }
});
