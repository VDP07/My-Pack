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
const db = firebase.firestore();

//
// Part 2: GET THE PACK ID FROM THE URL
// ===================================
//
const urlParams = new URLSearchParams(window.location.search);
const packId = urlParams.get('id');

//
// Part 3: GET HTML ELEMENTS
// ===================================
//
const packTitleElement = document.getElementById('pack-title');
const addItemForm = document.querySelector('.add-item-form');
const newItemInput = document.getElementById('new-item-input');
const newItemNoteInput = document.getElementById('new-item-note-input'); // NEW: Find the note input
const itemList = document.getElementById('item-list');

//
// Part 4: LOAD THE PACK'S TITLE
// ===================================
//
db.collection('packs').doc(packId).get().then(doc => {
    if (doc.exists) {
        packTitleElement.textContent = doc.data().title;
        document.title = doc.data().title;
    } else {
        packTitleElement.textContent = "Pack not found";
    }
});

//
// Part 5: LISTEN FOR AND DISPLAY ITEMS
// ===================================
//
const itemsCollection = db.collection('packs').doc(packId).collection('items');

itemsCollection.orderBy('createdAt').onSnapshot(snapshot => {
    itemList.innerHTML = ''; 
    snapshot.forEach(doc => {
        const item = doc.data();
        const id = doc.id;

        const li = document.createElement('li');
        li.setAttribute('data-id', id);
        
        // UPDATED: Now includes a span for the note if it exists
        li.innerHTML = `
            <div class="item-content">
                <input type="checkbox" ${item.packed ? 'checked' : ''}>
                <span class="item-text ${item.packed ? 'packed' : ''}">${item.name}</span>
                ${item.note ? `<span class="item-note">${item.note}</span>` : ''}
            </div>
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
    event.preventDefault(); 
    const itemName = newItemInput.value.trim();
    const itemNote = newItemNoteInput.value.trim(); // NEW: Get the note value

    if (itemName) {
        // UPDATED: Add the new 'note' field to the database
        itemsCollection.add({
            name: itemName,
            note: itemNote, // Add the note here
            packed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const packRef = db.collection('packs').doc(packId);
        packRef.update({
            totalItems: firebase.firestore.FieldValue.increment(1)
        });

        newItemInput.value = ''; 
        newItemNoteInput.value = ''; // NEW: Clear the note input box
    }
});

//
// Part 7: UPDATE (PACK/UNPACK) AND DELETE ITEMS
// ===================================
//
itemList.addEventListener('click', (event) => {
    const target = event.target;
    const li = target.closest('li');
    if (!li) return; // Exit if the click wasn't inside a list item

    const id = li.getAttribute('data-id');
    const packRef = db.collection('packs').doc(packId);

    if (target.classList.contains('delete-item-icon')) {
        itemsCollection.doc(id).delete();
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            packRef.update({
                totalItems: firebase.firestore.FieldValue.increment(-1),
                packedItems: firebase.firestore.FieldValue.increment(-1)
            });
        } else {
            packRef.update({
                totalItems: firebase.firestore.FieldValue.increment(-1)
            });
        }
    }

    if (target.type === 'checkbox') {
        const isPacked = target.checked;
        itemsCollection.doc(id).update({ packed: isPacked });
        if (isPacked) {
            packRef.update({ packedItems: firebase.firestore.FieldValue.increment(1) });
        } else {
            packRef.update({ packedItems: firebase.firestore.FieldValue.increment(-1) });
        }
    }
});