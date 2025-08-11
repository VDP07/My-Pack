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
// Part 3: GET HTML ELEMENTS
// ===================================
// // This is our main function to draw all the packs on the screen.
function displayPacks() {
    // First, we clear the screen of any old list to prevent duplicates.
    packListContainer.innerHTML = '';

    // Check if the database collection is empty
    if (snapshot.empty) {
        packListContainer.innerHTML = `<p class="loading-message">No packs yet. Click the '+' button to add your first one!</p>`;
        return; // Stop the function here
    }

    // We loop through each document (each pack) in the database
    snapshot.forEach(doc => {
        const pack = doc.data(); // The data for the pack
        const id = doc.id;      // The unique ID of the document

        // Create a link element that will wrap our card
        const link = document.createElement('a');
        link.href = `pack.html?id=${id}`; // This is the magic! We pass the ID in the URL.

        // Create the HTML card for the pack
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';

        packCard.innerHTML = `
            <div class="pack-card-header">
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-trash-alt delete-icon" data-id="${id}"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p>${pack.category}</p>
            </div>
        `;

        // Put the card inside the link, and put the link on the page
        link.appendChild(packCard);
        packListContainer.appendChild(link);
    });
}

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


// Part 5: DELETE A PACK
// ===================================
//
packListContainer.addEventListener('click', (event) => {
    // Check if the clicked element was a delete icon
    if (event.target.classList.contains('delete-icon')) {
        event.preventDefault(); // IMPORTANT: Stop the link from being followed
        const confirmDelete = confirm("Are you sure you want to delete this pack?");
        if (confirmDelete) {
            const id = event.target.getAttribute('data-id');
            // Tell Firebase to delete the document with this specific ID
            packsCollection.doc(id).delete();
        }
    }
});