//
// Part 1: CONNECT TO FIREBASE (same as before)
// ===================================
//
// TODO: Paste your Firebase config object here.
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
const db = firebase.firestore();

//
// Part 2: GET THE PACK ID FROM THE URL
// ===================================
//
// This code reads the "note" we passed in the URL to find the pack's unique ID.
const urlParams = new URLSearchParams(window.location.search);
const packId = urlParams.get('id');

//
// Part 3: GET HTML ELEMENTS
// ===================================
//
const packTitleElement = document.getElementById('pack-title');
const addItemForm = document.querySelector('.add-item-form');
const newItemInput = document.getElementById('new-item-input');
const itemList = document.getElementById('item-list');

//
// Part 4: LOAD THE PACK'S TITLE
// ===================================
//
// We fetch the specific pack document from Firebase to get its title.
db.collection('packs').doc(packId).get().then(doc => {
    if (doc.exists) {
        packTitleElement.textContent = doc.data().title;
        document.title = doc.data().title; // Also set the browser tab title
    } else {
        packTitleElement.textContent = "Pack not found";
    }
});

//
// Part 5: LISTEN FOR AND DISPLAY ITEMS
// ===================================
//
// This is the core logic. We are listening to a sub-collection called "items"
// that lives inside our specific pack document.
const itemsCollection = db.collection('packs').doc(packId).collection('items');

itemsCollection.orderBy('createdAt').onSnapshot(snapshot => {
    itemList.innerHTML = ''; // Clear the list
    snapshot.forEach(doc => {
        const item = doc.data();
        const id = doc.id;

        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        li.innerHTML = `
            <input type="checkbox" ${item.packed ? 'checked' : ''}>
            <span class="item-text ${item.packed ? 'packed' : ''}">${item.name}</span>
            <i class="fas fa-trash-alt delete-item-icon"></i>
        `;
        itemList.appendChild(li);
    });
});

//
// Part 6: ADD A NEW ITEM
// ===================================
//
addItemForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Stop the form from reloading the page
    const itemName = newItemInput.value.trim();
    if (itemName) {
        itemsCollection.add({
            name: itemName,
            packed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newItemInput.value = ''; // Clear the input box
    }
});

//
// Part 7: UPDATE (PACK/UNPACK) AND DELETE ITEMS
// ===================================
//
itemList.addEventListener('click', (event) => {
    const target = event.target;
    const li = target.closest('li');
    const id = li.getAttribute('data-id');

    // If the trash can icon was clicked
    if (target.classList.contains('delete-item-icon')) {
        itemsCollection.doc(id).delete();
    }

    // If the checkbox was clicked
    if (target.type === 'checkbox') {
        const isPacked = target.checked;
        itemsCollection.doc(id).update({ packed: isPacked });
    }
});