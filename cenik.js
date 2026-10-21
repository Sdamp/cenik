const content = document.getElementById('content');

let allData = [];
// Index vybrané kategorie, null = zobrazit celý ceník
let selectedIndex = 0;
let searchTerm = '';

async function loadCenik() {
    allData = await fetch('cenik.json').then(res => res.json());
    renderCenik(allData);
}

function renderCenik(data) {
    content.innerHTML = `<div class="header">
                <h1>Ceník služeb</h1>
                <input type="text" class="search-box" id="searchBox" placeholder="Vyhledat službu...">
            </div>
            <p class="section-label">Vyberte kategorii</p>
            <div class="category-grid">${data.map(renderCategoryCard).join('')}</div>
            <div class="view-bar">
                <span id="viewLabel"></span>
                <button type="button" class="show-all" id="showAll">Zobrazit celý ceník</button>
            </div>
            <ul id="categoryList">${data.map(renderCategory).join('')}</ul>
            <p class="no-results hidden" id="noResults">Žádná služba neodpovídá hledání.</p>`;

    // Přidání event listeneru pro vyhledávání
    document.getElementById('searchBox').addEventListener('input', handleSearch);

    // Výběr kategorie kliknutím na kartu
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedIndex = Number(card.dataset.index);
            clearSearch();
            updateView();
        });
    });

    document.getElementById('showAll').addEventListener('click', () => {
        selectedIndex = null;
        clearSearch();
        updateView();
    });

    updateView();
}

// Funkce pro odeslání výšky obsahu do rodičovského okna (iframe)
function sendHeightToParent() {
    const contentEl = document.getElementById('content');
    const height = contentEl ? contentEl.offsetHeight : document.body.scrollHeight;
    window.parent.postMessage({ type: 'resize', height: height }, '*');
}

const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// 1 položka, 2–4 položky, 0 a 5+ položek
const formatCount = (count) => {
    if (count === 1) return '1 položka';
    if (count >= 2 && count <= 4) return `${count} položky`;
    return `${count} položek`;
};

const formatPrice = (price) => price === 0 ? 'zdarma' : `${price.toLocaleString('cs-CZ')} Kč`;

const renderCategoryCard = (category, index) => `
    <button type="button" class="category-card" data-index="${index}">
        <span class="category-card-name">${escapeHtml(category.name)}</span>
        <span class="category-card-count">${formatCount(category.items.length)}</span>
        <span class="category-card-action"></span>
    </button>`;

const renderCategory = (category, index) => {
    const noteHtml = category.note ? `<p class="category-note">${escapeHtml(category.note)}</p>` : '';
    const itemsHtml = category.items.map(item => {
        const keywords = item.keywords ? item.keywords.join(' ').toLowerCase() : '';
        const itemNoteHtml = item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : '';
        return `<li class="item" data-item-name="${escapeHtml(item.name.toLowerCase())}" data-keywords="${escapeHtml(keywords)}">
                    <div class="item-header">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        <span class="price">${formatPrice(item.price)}</span>
                    </div>
                    ${itemNoteHtml}
                </li>`;
    }).join('');

    return `<li class="category" data-index="${index}" data-category-name="${escapeHtml(category.name.toLowerCase())}">
                <h2>${escapeHtml(category.name)}</h2>
                ${noteHtml}
                <ul>${itemsHtml}</ul>
            </li>`;
};

function handleSearch(e) {
    searchTerm = e.target.value.trim().toLowerCase();
    updateView();
}

function clearSearch() {
    searchTerm = '';
    document.getElementById('searchBox').value = '';
}

// Zobrazí vybranou kategorii / celý ceník / výsledky hledání
function updateView() {
    const searching = searchTerm !== '';
    let anyVisible = false;

    document.querySelectorAll('.category-card').forEach(card => {
        const isSelected = !searching && Number(card.dataset.index) === selectedIndex;
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-pressed', isSelected);
        card.querySelector('.category-card-action').textContent = isSelected ? 'Vybráno' : 'Zobrazit ceník →';
    });

    document.querySelectorAll('.category').forEach(category => {
        const items = category.querySelectorAll('.item');
        let hasVisibleItems = false;

        if (searching) {
            // Kontrola, zda se hledaný text shoduje s kategorií
            const categoryMatch = category.dataset.categoryName.includes(searchTerm);
            items.forEach(item => {
                const match = categoryMatch
                    || item.dataset.itemName.includes(searchTerm)
                    || item.dataset.keywords.includes(searchTerm);
                item.classList.toggle('hidden', !match);
                if (match) hasVisibleItems = true;
            });
        } else {
            items.forEach(item => item.classList.remove('hidden'));
            hasVisibleItems = selectedIndex === null || Number(category.dataset.index) === selectedIndex;
        }

        category.classList.toggle('hidden', !hasVisibleItems);
        if (hasVisibleItems) anyVisible = true;
    });

    const viewLabel = document.getElementById('viewLabel');
    if (searching) {
        viewLabel.textContent = `Výsledky hledání: „${searchTerm}“`;
    } else if (selectedIndex === null) {
        viewLabel.textContent = 'Zobrazen celý ceník';
    } else {
        viewLabel.textContent = `Zobrazena kategorie: ${allData[selectedIndex].name}`;
    }

    document.getElementById('showAll').classList.toggle('hidden', !searching && selectedIndex === null);
    document.getElementById('noResults').classList.toggle('hidden', anyVisible);

    // Po změně obsahu pošli novou výšku do rodičovského okna
    sendHeightToParent();
}

loadCenik();

// Naslouchat změnám velikosti obsahu
const resizeObserver = new ResizeObserver(() => {
    sendHeightToParent();
});

// Sledovat změny velikosti těla dokumentu
resizeObserver.observe(document.body);

// Poslat výšku i při načtení okna
window.addEventListener('load', sendHeightToParent);
