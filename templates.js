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
const templatesCollection = db.collection('templates');

//
// Part 2: GET HTML ELEMENTS
// ===================================
//
const templateListContainer = document.getElementById('template-list-container');

//
// Part 3: LISTEN FOR AND DISPLAY TEMPLATES
// ===================================
//
templatesCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    templateListContainer.innerHTML = ''; // Clear the list

    if (snapshot.empty) {
        templateListContainer.innerHTML = `<p class="loading-message">No templates saved yet. Go to a pack and click "Save as Template" to create one!</p>`;
        return;
    }

    snapshot.forEach(doc => {
        const template = doc.data();
        const id = doc.id;

        const templateCard = document.createElement('div');
        templateCard.className = 'pack-card'; // We can reuse the same card style
        templateCard.setAttribute('data-id', id);

        const headerClass = template.category ? `header-${template.category.toLowerCase()}` : 'header-general';

        templateCard.innerHTML = `
            <div class="pack-card-header ${headerClass}">
                <h2>${template.name}</h2>
                <div class="card-actions">
                    <i class="fas fa-trash-alt delete-icon"></i>
                </div>
            </div>
            <div class="pack-card-body">
                <p class="pack-category-display ${template.category ? template.category.toLowerCase() : ''}">${template.category || 'General'}</p>
            </div>
        `;
        templateListContainer.appendChild(templateCard);
    });
});

//
// Part 4: DELETE A TEMPLATE
// ===================================
//
templateListContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-icon')) {
        const confirmDelete = confirm("Are you sure you want to permanently delete this template?");
        if (confirmDelete) {
            const card = event.target.closest('.pack-card');
            const id = card.getAttribute('data-id');
            templatesCollection.doc(id).delete();
        }
    }
});
