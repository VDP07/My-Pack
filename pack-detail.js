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
const auth = firebase.auth();

//
// Part 2: GET THE PACK ID & OWNER ID FROM THE URL
// ===================================
//
const urlParams = new URLSearchParams(window.location.search);
const packId = urlParams.get('id');
const ownerId = urlParams.get('ownerId'); // NEW: Get the owner's ID

//
// Part 3: GET HTML ELEMENTS
// ===================================
//
const packTitleElement = document.getElementById('pack-title');
const addItemForm = document.querySelector('.add-item-form');
const newItemInput = document.getElementById('new-item-input');
const newItemNoteInput = document.getElementById('new-item-note-input');
const itemList = document.getElementById('item-list');
const saveTemplateBtn = document.getElementById('save-template-btn');
const sharePackBtn = document.getElementById('share-pack-btn');
const shareModal = document.getElementById('share-modal');
const closeShareModalBtn = shareModal.querySelector('.close-button');
const shareForm = document.getElementById('share-form');
const collaboratorsListUl = document.querySelector('#collaborators-list ul');

//
// Part 4: APP STATE & AUTH
// ===================================
//
let currentPackData = {};
let currentUser = null;
let packRef; // This will be our reference to the pack document
let itemsCollection; // This will be the reference to the items sub-collection
let unsubscribePackListener = null;

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        // Determine the correct path to the pack document
        const packOwnerId = ownerId || user.uid; // If ownerId is in URL use it, otherwise assume current user is owner
        packRef = db.collection('users').doc(packOwnerId).collection('packs').doc(packId);
        itemsCollection = packRef.collection('items');
        
        loadPackDetails();
        listenForItems();
    } else {
        window.location.href = '/';
    }
});


//
// Part 5: LOAD PACK AND ITEMS
// ===================================
//
function loadPackDetails() {
    if (!packRef) return;
    
    // Set up a real-time listener for the pack itself
    unsubscribePackListener = packRef.onSnapshot(doc => {
        if (doc.exists) {
            currentPackData = doc.data();
            packTitleElement.textContent = currentPackData.title;
            document.title = currentPackData.title;
            renderCollaborators(currentPackData.collaboratorEmails || []);
            
            // Only the owner can save as template or share
            if (currentPackData.ownerId !== currentUser.uid) {
                saveTemplateBtn.style.display = 'none';
                sharePackBtn.style.display = 'none';
            }

        } else {
            packTitleElement.textContent = "Pack not found";
        }
    });
}


let sortableInstance = null;

function listenForItems() {
    if (!itemsCollection) return;
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
}

//
// Part 6: ADD A NEW ITEM
// ===================================
//
addItemForm.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    const itemName = newItemInput.value.trim();
    const itemNote = newItemNoteInput.value.trim();

    if (itemName && itemsCollection) {
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
    if (!li || !packRef) return;

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
    if (!itemsCollection) return;
    const templateName = prompt("Enter a name for this template:", currentPackData.title);
    if (!templateName) return;

    try {
        const itemsSnapshot = await itemsCollection.orderBy('order').get();
        const itemsData = itemsSnapshot.docs.map(doc => doc.data());

        const templatesCollectionRef = db.collection('templates');
        const newTemplateRef = await templatesCollectionRef.add({
            name: templateName,
            category: currentPackData.category,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const batch = db.batch();
        const newItemsCollection = newTemplateRef.collection('items');
        itemsData.forEach(item => {
            const { packed, ...templateItem } = item;
            const newItemRef = newItemsCollection.doc();
            batch.set(newItemRef, templateItem);
        });

        await batch.commit();
        alert(`Template "${templateName}" saved successfully!`);

    } catch (error) {
        console.error("Error saving template: ", error);
        alert("There was an error saving the template.");
    }
});

//
// Part 9: SHARING LOGIC
// ===================================
//
function renderCollaborators(collaborators) {
    collaboratorsListUl.innerHTML = '';
    const ownerEmail = currentPackData.ownerEmail || 'Owner';
    const ownerLi = document.createElement('li');
    ownerLi.innerHTML = `${ownerEmail} <strong>(Owner)</strong>`;
    collaboratorsListUl.appendChild(ownerLi);

    if (collaborators && collaborators.length > 0) {
        collaborators.forEach(email => {
            const li = document.createElement('li');
            li.textContent = email;
            collaboratorsListUl.appendChild(li);
        });
    }
}

sharePackBtn.addEventListener('click', () => {
    shareModal.style.display = 'block';
});

closeShareModalBtn.addEventListener('click', () => {
    shareModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == shareModal) {
        shareModal.style.display = 'none';
    }
});

shareForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const emailToShare = document.getElementById('share-email-input').value.trim();
    if (!emailToShare || !packRef) return;
    
    if (emailToShare === currentUser.email) {
        alert("You can't share a pack with yourself.");
        return;
    }

    try {
        await packRef.update({
            collaboratorEmails: firebase.firestore.FieldValue.arrayUnion(emailToShare)
        });

        alert(`Pack shared with ${emailToShare}! They will see it in their list the next time they log in.`);
        shareForm.reset();
        
    } catch (error) {
        console.error("Error sharing pack:", error);
        alert("Could not share pack. Please check the email and try again.");
    }
});
