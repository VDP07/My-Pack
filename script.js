//
// Part 1: CONNECT TO FIREBASE
// ===================================
//
// TODO: Paste your Firebase config object here that you saved earlier.
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
// Create a reference to our "packs" collection. A collection is like a folder.
const packsCollection = db.collection('packs');


//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const packListContainer = document.getElementById('pack-list-container');
const addPackButton = document.getElementById('add-pack-button');


//
// Part 3: DISPLAY THE PACKS FROM THE DATABASE
// ===================================
//
// This is the most important function. It listens for ANY change in our database collection.
packsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    // First, clear the list on the screen
    packListContainer.innerHTML = '';
    
    // Check if the database collection is empty
    if (snapshot.empty) {
        packListContainer.innerHTML = `<p class="loading-message">No packs yet. Click the '+' button to add your first one!</p>`;
        return;
    }

    // Loop through each document (each pack) in the database
    snapshot.forEach(doc => {
        const pack = doc.data(); // The data for the pack
        const id = doc.id;      // The unique ID of the document

        // Create the HTML card for the pack
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';
        packCard.setAttribute('data-id', id);

        packCard.innerHTML = `
            <div class="pack-card-header">
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-trash-alt delete-icon"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p>${pack.category}</p>
            </div>
        `;
        packListContainer.appendChild(packCard);
    });
});


//
// Part 4: ADD A NEW PACK
// ===================================
//
addPackButton.addEventListener('click', () => {
    const title = prompt("Enter the name for your new pack:");
    if (title) {
        // Add a new document to our 'packs' collection in Firebase
        packsCollection.add({
            title: title,
            category: "General",
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Add a timestamp
        });
    }
});


//
// Part 5: DELETE A PACK
// ===================================
//
packListContainer.addEventListener('click', (event) => {
    // Check if the clicked element was a delete icon
    if (event.target.classList.contains('delete-icon')) {
        const confirmDelete = confirm("Are you sure you want to delete this pack?");
        if (confirmDelete) {
            const card = event.target.closest('.pack-card');
            const id = card.getAttribute('data-id');
            // Tell Firebase to delete the document with this specific ID
            packsCollection.doc(id).delete();
        }
    }
});