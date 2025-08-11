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
const newItemNoteInput = document.getElementById('new-item-note-input');
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
let sortableInstance = null; // To hold our SortableJS instance

// UPDATED: Now we order by the 'order' field
itemsCollection.orderBy('order').onSnapshot(snapshot => {
    itemList.innerHTML = ''; 
    const items = [];
    snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
    });

    items.forEach(item => {
        const li = document.createElement('li');
        li.setAttribute('data-id', item.id);
        
        li.innerHTML = `
            <div class="item-content">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <input type="checkbox" ${item.packed ? 'checked' : ''}>
                <div class="item-details">
                    <span class="item-text ${item.packed ? 'packed' : ''}">${item.name}</span>
                    ${item.note ? `<span class="item-note">${item.note}</span>` : ''}
                </div>
            </div>
            <i class="fas fa-trash-alt delete-item-icon"></i>
        `;
        itemList.appendChild(li);
    });

    // Initialize SortableJS after items are rendered
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(itemList, {
        handle: '.drag-handle', // Use the grip icon to drag
        animation: 150,
        ghostClass: 'sortable-ghost', // A class for the drop placeholder
        onEnd: saveOrder, // Call our save function when dragging ends
    });
});

//
// Part 6: ADD A NEW ITEM
// ===================================
//
addItemForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    const itemName = newItemInput.value.trim();
    const itemNote = newItemNoteInput.value.trim();

    if (itemName) {
        // Get the current number of items to set the order for the new one
        const currentItemsSnapshot = await itemsCollection.get();
        const newOrder = currentItemsSnapshot.size;

        itemsCollection.add({
            name: itemName,
            note: itemNote,
            packed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            order: newOrder // Set the order to be the last item
        });

        const packRef = db.collection('packs').doc(packId);
        packRef.update({
            totalItems: firebase.firestore.FieldValue.increment(1)
        });

        newItemInput.value = ''; 
        newItemNoteInput.value = '';
    }
});

//
// Part 7: UPDATE, DELETE, AND SAVE ORDER
// ===================================
//
function saveOrder() {
    const items = itemList.querySelectorAll('li');
    const batch = db.batch(); // Use a batch to update all items at once

    items.forEach((item, index) => {
        const docId = item.getAttribute('data-id');
        const docRef = itemsCollection.doc(docId);
        batch.update(docRef, { order: index });
    });

    batch.commit(); // Send all updates to Firebase
}

itemList.addEventListener('click', (event) => {
    const target = event.target;
    const li = target.closest('li');
    if (!li) return;

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
        // After deleting, we should re-run saveOrder to fix the order numbers
        setTimeout(saveOrder, 100);
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
