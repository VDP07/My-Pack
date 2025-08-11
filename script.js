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
// This block listens for changes in the database and redraws the screen.
packsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    // First, clear the list on the screen to prevent duplicates.
    packListContainer.innerHTML = '';
    
    // Check if the database collection is empty
    if (snapshot.empty) {
        packListContainer.innerHTML = `<p class="loading-message">No packs yet. Click the '+' button to add your first one!</p>`;
        return;
    }

    // Loop through each document (each pack) that comes from the database
    snapshot.forEach(doc => {
        const pack = doc.data();
        const id = doc.id;

        // Create a link that will wrap our card
        const link = document.createElement('a');
        link.href = `pack.html?id=${id}`;
        
        // Create the HTML card for the pack
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';

        packCard.innerHTML = `
            <div class="pack-card-header">
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    {/* CHANGE #1: Added the new edit icon here */}
                    <i class="fas fa-pencil-alt edit-icon" data-id="${id}"></i>
                    <i class="fas fa-trash-alt delete-icon" data-id="${id}"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p>${pack.category || 'General'}</p>
            </div>
        `;
        
        // Put the card inside the link, and put the link on the page
        link.appendChild(packCard);
        packListContainer.appendChild(link);