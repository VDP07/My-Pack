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
const packsCollection = db.collection('packs');

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const packListContainer = document.getElementById('pack-list-container');
const addPackButton = document.getElementById('add-pack-button');
const modal = document.getElementById('add-pack-modal');
const closeModalButton = document.querySelector('.close-button');
const addPackForm = document.getElementById('add-pack-form');
const searchInput = document.getElementById('search-input');
const filterContainer = document.querySelector('.filter-container');

//
// Part 3: APP STATE & RENDERING
// ===================================
//
let allPacks = [];
let currentFilter = 'all';
let sortableInstance = null; // To hold our SortableJS instance

function filterAndRenderPacks() {
    const searchTerm = searchInput.value.toLowerCase();
    let filteredPacks = allPacks;

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
        packListContainer.innerHTML = `<p class="loading-message">No packs found.</p>`;
        return;
    }

    packsToRender.forEach(pack => {
        const link = document.createElement('a');
        link.href = `pack.html?id=${pack.id}`;
        // The link itself will be the draggable item
        link.setAttribute('data-id', pack.id); 
        
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';

        packCard.innerHTML = `
            <div class="pack-card-header">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-pencil-alt edit-icon" data-id="${pack.id}"></i>
                    <i class="fas fa-trash-alt delete-icon" data-id="${pack.id}"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p class="pack-category-display ${pack.category ? pack.category.toLowerCase() : ''}">${pack.category || 'General'}</p>
                <p class="pack-date-display">${pack.date || ''}</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${((pack.packedItems || 0) / (pack.totalItems || 1)) * 100}%;"></div>
                </div>
                <p class="progress-text">${pack.packedItems || 0} / ${pack.totalItems || 0} items</p>
            </div>
        `;
        
        link.appendChild(packCard);
        packListContainer.appendChild(link);
    });

    // Initialize SortableJS after packs are rendered
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    sortableInstance = new Sortable(packListContainer, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: savePackOrder,
    });
}

// UPDATED: Now we order by the 'order' field
packsCollection.orderBy('order').onSnapshot(snapshot => {
    allPacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterAndRenderPacks();
});

//
// Part 4: HANDLE SEARCH AND FILTER
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
// Part 5: HANDLE THE "ADD PACK" MODAL
// ===================================
//
addPackButton.addEventListener('click', () => {
    modal.style.display = "block";
});

closeModalButton.addEventListener('click', () => {
    modal.style.display = "none";
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

addPackForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('pack-title-input').value;
    const category = document.getElementById('pack-category-input').value;
    const date = document.getElementById('pack-date-input').value;

    if (title) {
        const currentPacksSnapshot = await packsCollection.get();
        const newOrder = currentPacksSnapshot.size;

        packsCollection.add({
            title: title,
            category: category,
            date: date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalItems: 0,
            packedItems: 0,
            order: newOrder // Set order for the new pack
        });
        addPackForm.reset();
        modal.style.display = "none";
    }
});

//
// Part 6: EDIT, DELETE, AND SAVE ORDER
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
    if (event.target.classList.contains('delete-icon')) {
        event.preventDefault(); 
        const confirmDelete = confirm("Are you sure you want to delete this pack?");
        if (confirmDelete) {
            const id = event.target.getAttribute('data-id');
            packsCollection.doc(id).delete();
            // We don't need to re-order here, the onSnapshot listener will handle it
        }
    }
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
});
