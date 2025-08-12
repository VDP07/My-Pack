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
const auth = firebase.auth(); // NEW: Initialize Firebase Auth
const templatesCollection = db.collection('templates');
let packsCollection; // This will be set when the user logs in

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const userAuthContainer = document.getElementById('user-auth-container');
const appContent = document.getElementById('app-content');
const loginPrompt = document.getElementById('login-prompt');
const packListContainer = document.getElementById('pack-list-container');
const addPackButton = document.getElementById('add-pack-button');
const modal = document.getElementById('add-pack-modal');
const modalTitle = modal.querySelector('h2');
const closeModalButton = modal.querySelector('.close-button');
const searchInput = document.getElementById('search-input');
const filterContainer = document.querySelector('.filter-container');
const createBlankBtn = document.getElementById('create-blank-btn');
const createFromTemplateBtn = document.getElementById('create-from-template-btn');
const addPackForm = document.getElementById('add-pack-form');
const addFromTemplateForm = document.getElementById('add-from-template-form');
const templateSelectInput = document.getElementById('template-select-input');

//
// Part 3: AUTHENTICATION
// ===================================
//
let currentUser = null;
let unsubscribePacks = null; // To stop listening to old data when user logs out

// Listen for changes in user login state
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        // User is signed in
        appContent.style.display = 'block';
        loginPrompt.style.display = 'none';
        renderUserProfile(user);
        
        // Set the collection path to be specific to this user
        packsCollection = db.collection('users').doc(user.uid).collection('packs');
        listenForPacks();
    } else {
        // User is signed out
        appContent.style.display = 'none';
        loginPrompt.style.display = 'block';
        renderSignInButton();
        if (unsubscribePacks) unsubscribePacks(); // Stop listening to old data
    }
});

function renderUserProfile(user) {
    userAuthContainer.innerHTML = `
        <div id="user-profile">
            <img src="${user.photoURL}" alt="${user.displayName}" id="user-avatar">
            <div class="dropdown-menu" id="dropdown-menu">
                <a href="/templates.html">Templates</a>
                <a href="/archived.html">Archived</a>
                <button id="sign-out-btn">Sign Out</button>
            </div>
        </div>
    `;
    // Add event listeners for the new elements
    document.getElementById('user-avatar').addEventListener('click', () => {
        const menu = document.getElementById('dropdown-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    document.getElementById('sign-out-btn').addEventListener('click', () => auth.signOut());
}

function renderSignInButton() {
    userAuthContainer.innerHTML = ``; // Clear it in case there's anything
    // The main sign in button is in the login-prompt div
    document.getElementById('sign-in-btn').addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider);
    });
}


//
// Part 4: APP STATE & RENDERING
// ===================================
//
let allPacks = [];
let currentFilter = 'all';
let sortableInstance = null;
let currentEditId = null;

function formatDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const date = new Date(isoDate + 'T00:00:00');
    const options = { day: '2-digit', month: 'short', year: '2-digit' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
}

function filterAndRenderPacks() {
    if (!currentUser) return; // Don't run if logged out
    const searchTerm = searchInput.value.toLowerCase();
    let filteredPacks = allPacks.filter(pack => !pack.archived);

    if (currentFilter !== 'all') {
        filteredPacks = filteredPacks.filter(pack => pack.category === currentFilter);
    }

    if (searchTerm) {
        filteredPacks = filteredPacks.filter(pack => pack.title.toLowerCase().includes(searchTerm));
    }

    renderPacks(filteredPacks);
}

function renderPacks(packsToRender) {
    packListContainer.innerHTML = '';
    if (packsToRender.length === 0) {
        packListContainer.innerHTML = `<p class="loading-message">No active packs found.</p>`;
        return;
    }

    packsToRender.forEach(pack => {
        const link = document.createElement('a');
        link.href = `pack.html?id=${pack.id}`;
        link.setAttribute('data-id', pack.id); 
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';
        const headerClass = pack.category ? `header-${pack.category.toLowerCase()}` : 'header-general';
        packCard.innerHTML = `
            <div class="pack-card-header ${headerClass}">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-archive archive-icon" data-id="${pack.id}"></i>
                    <i class="fas fa-pencil-alt edit-icon" data-id="${pack.id}"></i>
                    <i class="fas fa-trash-alt delete-icon" data-id="${pack.id}"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p class="pack-category-display ${pack.category ? pack.category.toLowerCase() : ''}">${pack.category || 'General'}</p>
                <p class="pack-date-display">${formatDate(pack.date)}</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${((pack.packedItems || 0) / (pack.totalItems || 1)) * 100}%;"></div>
                </div>
                <p class="progress-text">${pack.packedItems || 0} / ${pack.totalItems || 0} items</p>
            </div>
        `;
        link.appendChild(packCard);
        packListContainer.appendChild(link);
    });

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(packListContainer, {
        handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost', onEnd: savePackOrder,
    });
}

function listenForPacks() {
    if (unsubscribePacks) unsubscribePacks(); // Unsubscribe from any previous listener
    unsubscribePacks = packsCollection.orderBy('order').onSnapshot(snapshot => {
        allPacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRenderPacks();
    }, error => {
        console.error("Error listening for packs: ", error);
        // This is where you might see a permission error if rules are wrong
    });
}

//
// Part 5: HANDLE SEARCH AND FILTER
// ===================================
//
searchInput.addEventListener('input', filterAndRenderPacks);
filterContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('filter-btn')) {
        document.querySelector('.filter-btn.active').classList.remove('active');
        event.target.classList.add('active');
        currentFilter = event.target.dataset.category;
        filterAndRenderPacks();
    }
});

//
// Part 6: HANDLE THE ADD/EDIT PACK MODAL
// ===================================
//
async function loadTemplatesIntoModal() {
    const snapshot = await templatesCollection.get();
    templateSelectInput.innerHTML = '<option value="" disabled selected>Choose a template...</option>';
    snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        templateSelectInput.appendChild(option);
    });
}

addPackButton.addEventListener('click', () => {
    currentEditId = null;
    modalTitle.textContent = "Create New Pack";
    addPackForm.querySelector('button').textContent = "Create Pack";
    modal.querySelector('.modal-options').style.display = 'flex';
    addPackForm.reset();
    modal.style.display = "block";
    loadTemplatesIntoModal();
});

closeModalButton.addEventListener('click', () => modal.style.display = "none");
window.addEventListener('click', (event) => {
    if (event.target == modal) modal.style.display = "none";
});

createBlankBtn.addEventListener('click', () => {
    createBlankBtn.classList.add('active');
    createFromTemplateBtn.classList.remove('active');
    addPackForm.style.display = 'flex';
    addFromTemplateForm.style.display = 'none';
});

createFromTemplateBtn.addEventListener('click', () => {
    createFromTemplateBtn.classList.add('active');
    createBlankBtn.classList.remove('active');
    addFromTemplateForm.style.display = 'flex';
    addPackForm.style.display = 'none';
});

addPackForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('pack-title-input').value;
    const category = document.getElementById('pack-category-input').value;
    const date = document.getElementById('pack-date-input').value;
    if (!title || !category) return alert("Please provide a title and select a category.");

    if (currentEditId) {
        packsCollection.doc(currentEditId).update({ title, category, date });
    } else {
        const currentPacksSnapshot = await packsCollection.where("archived", "==", false).get();
        const newOrder = currentPacksSnapshot.size;
        packsCollection.add({
            title, category, date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalItems: 0, packedItems: 0, order: newOrder, archived: false
        });
    }
    addPackForm.reset();
    modal.style.display = "none";
});

addFromTemplateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newPackTitle = document.getElementById('template-pack-title-input').value;
    const templateId = templateSelectInput.value;
    const newPackDate = document.getElementById('template-pack-date-input').value;
    if (!newPackTitle || !templateId) return alert("Please provide a title and select a template.");

    try {
        const templateDoc = await templatesCollection.doc(templateId).get();
        const templateData = templateDoc.data();
        const templateItemsSnapshot = await templatesCollection.doc(templateId).collection('items').get();
        const templateItems = templateItemsSnapshot.docs.map(doc => doc.data());
        const currentPacksSnapshot = await packsCollection.where("archived", "==", false).get();
        const newOrder = currentPacksSnapshot.size;
        const newPackRef = await packsCollection.add({
            title: newPackTitle, category: templateData.category, date: newPackDate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalItems: templateItems.length, packedItems: 0, order: newOrder, archived: false
        });
        const batch = db.batch();
        const newItemsCollection = newPackRef.collection('items');
        templateItems.forEach(item => {
            const newItemRef = newItemsCollection.doc();
            batch.set(newItemRef, item);
        });
        await batch.commit();
        addFromTemplateForm.reset();
        modal.style.display = "none";
    } catch (error) {
        console.error("Error creating pack from template: ", error);
        alert("There was an error creating the pack.");
    }
});

//
// Part 7: ACTIONS & SAVE ORDER
// ===================================
//
function savePackOrder() {
    const links = packListContainer.querySelectorAll('a');
    const batch = db.batch();
    links.forEach((link, index) => {
        const docId = link.getAttribute('data-id');
        const docRef = packsCollection.doc(docId);
        batch.update(docRef, { order: index });
    });
    batch.commit();
}

packListContainer.addEventListener('click', (event) => {
    const id = event.target.getAttribute('data-id');
    if (!id) return;

    if (event.target.classList.contains('archive-icon')) {
        event.preventDefault();
        packsCollection.doc(id).update({ archived: true });
    }
    else if (event.target.classList.contains('delete-icon')) {
        event.preventDefault(); 
        if (confirm("Are you sure you want to delete this pack?")) {
            packsCollection.doc(id).delete();
        }
    }
    else if (event.target.classList.contains('edit-icon')) {
        event.preventDefault(); 
        currentEditId = id;
        const packToEdit = allPacks.find(p => p.id === id);
        document.getElementById('pack-title-input').value = packToEdit.title;
        document.getElementById('pack-category-input').value = packToEdit.category;
        document.getElementById('pack-date-input').value = packToEdit.date;
        modalTitle.textContent = "Edit Pack";
        addPackForm.querySelector('button').textContent = "Save Changes";
        modal.querySelector('.modal-options').style.display = 'none';
        addPackForm.style.display = 'flex';
        addFromTemplateForm.style.display = 'none';
        modal.style.display = "block";
    }
});
