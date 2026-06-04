import { auth, db, storage } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Load dashboard data
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
    
    // Display tracks
    const musicLibrary = document.getElementById('musicLibrary');
    musicLibrary.innerHTML = '';
    
    for (const track of tracks) {
        let audioUrl = '';
        try {
            const audioRef = ref(storage, track.audioUrl);
            audioUrl = await getDownloadURL(audioRef);
        } catch (e) {
            console.error('Error getting audio URL:', e);
        }
        
        const trackCard = `
            <div class="col-md-4">
                <div class="music-card">
                    <div class="music-info">
                        <h5>${track.title}</h5>
                        <p class="text-muted">${track.duration} seconds</p>
                        <small>Uploaded: ${new Date(track.uploadedAt?.toDate()).toLocaleDateString()}</small>
                        <br>
                        <audio controls class="mt-2" style="width: 100%">
                            <source src="${audioUrl}" type="audio/mpeg">
                        </audio>
                    </div>
                </div>
            </div>
        `;
        musicLibrary.innerHTML += trackCard;
    }
};

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut();
    window.location.href = 'index.html';
});

// Auth check
auth.onAuthStateChanged((user) => {
    if (user) {
        loadDashboard();
    } else {
        window.location.href = 'index.html';
    }
});
