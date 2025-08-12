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
const packsCollection = db.collection('packs');

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const archivedListContainer = document.getElementById('archived-list-container');

//
// Part 3: LISTEN FOR AND DISPLAY ARCHIVED PACKS
// ===================================
//
// This query specifically fetches packs where the 'archived' field is true
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
                <p class="pack-date-display">${pack.date || ''}</p>
            </div>
        `;
        archivedListContainer.appendChild(packCard);
    });
});

//
// Part 4: UN-ARCHIVE OR DELETE A PACK
// ===================================
//
archivedListContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.pack-card');
    if (!card) return;
    
    const id = card.getAttribute('data-id');

    // If the restore icon was clicked
    if (event.target.classList.contains('unarchive-icon')) {
        packsCollection.doc(id).update({ archived: false });
    }

    // If the delete icon was clicked
    if (event.target.classList.contains('delete-icon')) {
        const confirmDelete = confirm("Are you sure you want to PERMANENTLY delete this pack and all its items?");
        if (confirmDelete) {
            // Note: Deleting a pack document does NOT automatically delete its sub-collections.
            // For a complete cleanup, more advanced code (a cloud function) would be needed.
            // For now, we will just delete the main pack document.
            packsCollection.doc(id).delete();
        }
    }
});
