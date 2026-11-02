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

// Zvýhodněná cena pro registrované pacienty — pole `registeredPrice`
// (a u slevy v % i `registeredDiscountPercent`) posílá intranet jen u položek,
// které ji mají. Částka je už spočítaná a zaokrouhlená, web nic nepočítá.
// Texty odpovídají intranetu (backend/shared/cenik/registeredPrice.js).
const REGISTERED_LABEL = 'Registrovaní pacienti';
const REGISTERED_LABEL_SHORT = 'Registrovaní';
const REGULAR_LABEL = 'Běžná cena';
const REGISTERED_NOTE = 'Zvýhodněná cena pro pacienty registrované na našich obvodech. '
    + 'Slevu může uplatnit registrovaný pacient i pro své dítě mladší 18 let.';

const hasRegisteredPrice = (item) => typeof item.registeredPrice === 'number';

const formatPercent = (percent) => `−${percent.toLocaleString('cs-CZ')} %`;

// Prvek s vysvětlivkou: title pro myš, tabindex + aria-describedby pro
// klávesnici a čtečky, po klepnutí (focus) se ukáže bublina i na dotyku.
const tipAttrs = (noteId) =>
    `tabindex="0" title="${escapeHtml(REGISTERED_NOTE)}" aria-describedby="${noteId}" data-tip="${escapeHtml(REGISTERED_NOTE)}"`;

const renderRegisteredCell = (item, noteId) => {
    if (!hasRegisteredPrice(item)) {
        return `<span class="price price-registered price-none" aria-label="Bez zvýhodněné ceny">–</span>`;
    }
    const discountHtml = typeof item.registeredDiscountPercent === 'number'
        ? `<span class="reg-discount">${formatPercent(item.registeredDiscountPercent)}</span>`
        : '';
    return `<span class="price price-registered">
                <span class="reg-price has-tip" ${tipAttrs(noteId)}>${formatPrice(item.registeredPrice)}</span>
                ${discountHtml}
            </span>`;
};

const renderCategoryCard = (category, index) => `
    <button type="button" class="category-card" data-index="${index}">
        <span class="category-card-name">${escapeHtml(category.name)}</span>
        <span class="category-card-count">${formatCount(category.items.length)}</span>
        <span class="category-card-action"></span>
    </button>`;

const renderCategory = (category, index) => {
    const noteHtml = category.note ? `<p class="category-note">${escapeHtml(category.note)}</p>` : '';
    // Dva cenové sloupce jen u kategorií, kde má zvýhodněnou cenu aspoň jedna položka
    const withRegistered = category.items.some(hasRegisteredPrice);
    const noteId = `reg-note-${index}`;

    const itemsHtml = category.items.map(item => {
        const keywords = item.keywords ? item.keywords.join(' ').toLowerCase() : '';
        const itemNoteHtml = item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : '';
        const registeredHtml = withRegistered ? renderRegisteredCell(item, noteId) : '';
        return `<li class="item" data-item-name="${escapeHtml(item.name.toLowerCase())}" data-keywords="${escapeHtml(keywords)}">
                    <div class="item-header${withRegistered ? ' with-registered' : ''}">
                        <span class="item-name">${escapeHtml(item.name)}</span>
                        <span class="price">${formatPrice(item.price)}</span>
                        ${registeredHtml}
                    </div>
                    ${itemNoteHtml}
                </li>`;
    }).join('');

    const priceHeadHtml = withRegistered
        ? `<div class="price-head">
                <span></span>
                <span class="price-head-cell">${REGULAR_LABEL}</span>
                <span class="price-head-cell has-tip" ${tipAttrs(noteId)}>
                    <span class="label-full">${REGISTERED_LABEL}</span><span class="label-short">${REGISTERED_LABEL_SHORT}</span>
                    <span class="tip-mark" aria-hidden="true">?</span>
                </span>
            </div>`
        : '';
    const registeredNoteHtml = withRegistered
        ? `<p class="registered-note" id="${noteId}"><strong>${REGISTERED_LABEL}:</strong> ${escapeHtml(REGISTERED_NOTE)}</p>`
        : '';

    return `<li class="category" data-index="${index}" data-category-name="${escapeHtml(category.name.toLowerCase())}">
                <h2>${escapeHtml(category.name)}</h2>
                ${noteHtml}
                ${priceHeadHtml}
                <ul>${itemsHtml}</ul>
                ${registeredNoteHtml}
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
