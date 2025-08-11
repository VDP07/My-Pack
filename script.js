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
// NEW: Get modal elements
const modal = document.getElementById('add-pack-modal');
const closeModalButton = document.querySelector('.close-button');
const addPackForm = document.getElementById('add-pack-form');

//
// Part 3: LISTEN FOR DATA AND DISPLAY PACKS
// ===================================
//
packsCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    packListContainer.innerHTML = '';
    
    if (snapshot.empty) {
        packListContainer.innerHTML = `<p class="loading-message">No packs yet. Click the '+' button to add your first one!</p>`;
        return;
    }

    snapshot.forEach(doc => {
        const pack = doc.data();
        const id = doc.id;
        const link = document.createElement('a');
        link.href = `pack.html?id=${id}`;
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';

        // UPDATED: Now displays the date and category
        packCard.innerHTML = `
            <div class="pack-card-header">
                <h2>${pack.title}</h2>
                <div class="card-actions">
                    <i class="fas fa-pencil-alt edit-icon" data-id="${id}"></i>
                    <i class="fas fa-trash-alt delete-icon" data-id="${id}"></i>
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
});

//
// Part 4: HANDLE THE "ADD PACK" MODAL
// ===================================
//
// Open the modal when the '+' button is clicked
addPackButton.addEventListener('click', () => {
    modal.style.display = "block";
});

// Close the modal when the 'x' is clicked
closeModalButton.addEventListener('click', () => {
    modal.style.display = "none";
});

// Close the modal if the user clicks outside of it
window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// Handle the form submission
addPackForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('pack-title-input').value;
    const category = document.getElementById('pack-category-input').value;
    const date = document.getElementById('pack-date-input').value;

    if (title) {
        packsCollection.add({
            title: title,
            category: category,
            date: date,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            totalItems: 0,
            packedItems: 0
        });
        addPackForm.reset(); // Clear the form
        modal.style.display = "none"; // Hide the modal
    }
});


//
// Part 5: EDIT AND DELETE PACKS
// ===================================
//
packListContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-icon')) {
        event.preventDefault(); 
        const confirmDelete = confirm("Are you sure you want to delete this pack?");
        if (confirmDelete) {
            const id = event.target.getAttribute('data-id');
            packsCollection.doc(id).delete();
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