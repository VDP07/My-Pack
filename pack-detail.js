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
const saveTemplateBtn = document.getElementById('save-template-btn'); // NEW: Get the template button

//
// Part 4: LOAD THE PACK'S TITLE
// ===================================
//
let currentPackData = {}; // To store the pack's data for templating
const packRef = db.collection('packs').doc(packId);

packRef.get().then(doc => {
    if (doc.exists) {
        currentPackData = doc.data();
        packTitleElement.textContent = currentPackData.title;
        document.title = currentPackData.title;
    } else {
        packTitleElement.textContent = "Pack not found";
    }
});

//
// Part 5: LISTEN FOR AND DISPLAY ITEMS
// ===================================
//
const itemsCollection = packRef.collection('items');
let sortableInstance = null;

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

    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(itemList, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: saveOrder,
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
        const currentItemsSnapshot = await itemsCollection.get();
        const newOrder = currentItemsSnapshot.size;

        itemsCollection.add({
            name: itemName,
            note: itemNote,
            packed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            order: newOrder
        });

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
    const batch = db.batch();

    items.forEach((item, index) => {
        const docId = item.getAttribute('data-id');
        const docRef = itemsCollection.doc(docId);
        batch.update(docRef, { order: index });
    });

    batch.commit();
}

itemList.addEventListener('click', (event) => {
    const target = event.target;
    const li = target.closest('li');
    if (!li) return;

    const id = li.getAttribute('data-id');

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

//
// Part 8: SAVE AS TEMPLATE
// ===================================
//
saveTemplateBtn.addEventListener('click', async () => {
    const templateName = prompt("Enter a name for this template:", currentPackData.title);
    if (!templateName) return;

    try {
        // 1. Get all items from the current pack
        const itemsSnapshot = await itemsCollection.orderBy('order').get();
        const itemsData = itemsSnapshot.docs.map(doc => doc.data());

        // 2. Create a new template document
        const templatesCollection = db.collection('templates');
        const newTemplateRef = await templatesCollection.add({
            name: templateName,
            category: currentPackData.category,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Create a batch to add all items to the new template's sub-collection
        const batch = db.batch();
        const newItemsCollection = newTemplateRef.collection('items');
        itemsData.forEach(item => {
            // We don't need packed status for a template
            const { packed, ...templateItem } = item;
            const newItemRef = newItemsCollection.doc(); // Create a new doc reference
            batch.set(newItemRef, templateItem);
        });

        // 4. Commit the batch
        await batch.commit();

        alert(`Template "${templateName}" saved successfully!`);

    } catch (error) {
        console.error("Error saving template: ", error);
        alert("There was an error saving the template.");
    }
});
