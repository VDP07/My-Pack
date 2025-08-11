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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create a reference to the Firestore database
const db = firebase.firestore();
// Create a reference to our "packs" collection.
const packsCollection = db.collection('packs');

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const packListContainer = document.getElementById('pack-list-container');
const addPackButton = document.getElementById('add-pack-button');

//
// Part 3: LISTEN FOR DATA AND DISPLAY PACKS
// ===================================
//
packsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    packListContainer.innerHTML = '';
    
    if (snapshot.empty) {
        packListContainer.innerHTML = `<p class="loading-message">No packs yet. Click the '+' button to add your first one!</p>`;
        return;
    }

    snapshot.forEach(doc => {
        const pack = doc.data();
        const id = doc.id;

        const link = document.createElement('a');
        link.href = `pack.html?id=${id}`;
        
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';

        packCard.innerHTML = `
            <div class="pack-card-header">
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-pencil-alt edit-icon" data-id="${id}"></i>
                    <i class="fas fa-trash-alt delete-icon" data-id="${id}"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p>${pack.category || 'General'}</p>
            </div>
        `;
        
        link.appendChild(packCard);
        packListContainer.appendChild(link);
    });
});

//
// Part 4: ADD A NEW PACK
// ===================================
//
addPackButton.addEventListener('click', () => {
    const title = prompt("Enter the name for your new pack:");
    if (title) {
        packsCollection.add({
            title: title,
            category: "General",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
});

//
// Part 5: EDIT AND DELETE PACKS
// ===================================
//
packListContainer.addEventListener('click', (event) => {
    // If the delete icon was clicked
    if (event.target.classList.contains('delete-icon')) {
        event.preventDefault(); 
        const confirmDelete = confirm("Are you sure you want to delete this pack?");
        if (confirmDelete) {
            const id = event.target.getAttribute('data-id');
            packsCollection.doc(id).delete();
        }
    }
    // ELSE IF the new edit icon was clicked
    else if (event.target.classList.contains('edit-icon')) {
        event.preventDefault(); 
        const id = event.target.getAttribute('data-id');
        const currentTitle = event.target.closest('.pack-card-header').querySelector('h2').textContent;
        const newTitle = prompt("Enter the new title:", currentTitle);

        if (newTitle && newTitle.trim() !== '') {
            packsCollection.doc(id).update({
                title: newTitle
            });
        }
    }
}); // <-- The error was likely a missing bracket here