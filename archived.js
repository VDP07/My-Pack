//
// Part 1: CONNECT TO FIREBASE
// ===================================
//
const firebaseConfig = {
  apiKey: "AIzaSyC_liB6C8htRS32vQlhg-ia21Yn4t0jU1w",
  authDomain: "my-pack-app.firebaseapp.com",
  projectId: "my-pack-app",
  storageBucket: "my-pack-app.firebasestorage.app",
  messagingSenderId: "274047313523",
  appId: "1:274047313523:web:128a39ad70274c765a6c06"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // NEW: Initialize Auth
let packsCollection; // Will be set when user logs in

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const archivedListContainer = document.getElementById('archived-list-container');

//
// Part 3: AUTHENTICATION
// ===================================
//
auth.onAuthStateChanged(user => {
    if (user) {
        // CORRECTED: Point to the user's private packs collection
        packsCollection = db.collection('users').doc(user.uid).collection('packs');
        listenForArchivedPacks();
    } else {
        // If user is not logged in, redirect to the home page
        window.location.href = '/';
    }
});


//
// Part 4: HELPER FUNCTION
// ===================================
//
function formatDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const date = new Date(isoDate + 'T00:00:00');
    const options = { day: '2-digit', month: 'short', year: '2-digit' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
}

//
// Part 5: LISTEN FOR AND DISPLAY ARCHIVED PACKS
// ===================================
//
function listenForArchivedPacks() {
    if (!packsCollection) return;
    
    packsCollection.where("archived", "==", true).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        archivedListContainer.innerHTML = ''; // Clear the list

        if (snapshot.empty) {
            archivedListContainer.innerHTML = `<p class="loading-message">You have no archived packs.</p>`;
            return;
        }

        snapshot.forEach(doc => {
            const pack = doc.data();
            const id = doc.id;

            const packCard = document.createElement('div');
            packCard.className = 'pack-card';
            packCard.setAttribute('data-id', id);

            const headerClass = pack.category ? `header-${pack.category.toLowerCase()}` : 'header-general';

            packCard.innerHTML = `
                <div class="pack-card-header ${headerClass}">
                    <h2>${pack.title}</h2>
                    <div class="card-actions">
                        <i class="fas fa-undo unarchive-icon" title="Restore Pack"></i>
                        <i class="fas fa-trash-alt delete-icon" title="Delete Permanently"></i>
                    </div>
                </div>
                <div class="pack-card-body">
                    <p class="pack-category-display ${pack.category ? pack.category.toLowerCase() : ''}">${pack.category || 'General'}</p>
                    <p class="pack-date-display">${formatDate(pack.date)}</p>
                </div>
            `;
            archivedListContainer.appendChild(packCard);
        });
    }, error => {
        console.error("Error fetching archived packs:", error);
        archivedListContainer.innerHTML = `<p class="loading-message">Could not load archived packs. You may need to create a database index.</p>`;
    });
}

//
// Part 6: UN-ARCHIVE OR DELETE A PACK
// ===================================
//
archivedListContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.pack-card');
    if (!card || !packsCollection) return;
    
    const id = card.getAttribute('data-id');

    // If the restore icon was clicked
    if (event.target.classList.contains('unarchive-icon')) {
        packsCollection.doc(id).update({ archived: false });
    }

    // If the delete icon was clicked
    if (event.target.classList.contains('delete-icon')) {
        const confirmDelete = confirm("Are you sure you want to PERMANENTLY delete this pack and all its items?");
        if (confirmDelete) {
            packsCollection.doc(id).delete();
        }
    }
});
