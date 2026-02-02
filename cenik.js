const content = document.getElementById('content');

let html = '';
let allData = [];

async function loadCenik() {
    allData = await fetch('cenik.json').then(res => res.json());
    renderCenik(allData);
}

function renderCenik(data) {
    html = `<div class="header">
                <h1>Ceník služeb</h1>
                <input type="text" class="search-box" id="searchBox" placeholder="Vyhledat...">
            </div>
            <ul id="categoryList">`;
    data.forEach(category => renderCategory(category));
    html += '</ul>';
    content.innerHTML = html;
    
    // Přidání event listeneru pro vyhledávání
    document.getElementById('searchBox').addEventListener('input', handleSearch);
}

const renderCategory = (category) => {
    html += `<li class="category" data-category-name="${category.name.toLowerCase()}">
                <strong>${category.name}</strong>
                <span>${category.note}</span>
            <ul>`;
    category.items.forEach(item => {
        const keywords = item.keywords ? item.keywords.join(' ').toLowerCase() : '';
        html += `<li class="item" data-item-name="${item.name.toLowerCase()}" data-keywords="${keywords}">${item.name}: ${item.price}</li>`;
    });
    html += '</ul></li>';
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const categories = document.querySelectorAll('.category');
    
    categories.forEach(category => {
        const categoryName = category.dataset.categoryName;
        const items = category.querySelectorAll('.item');
        let hasVisibleItems = false;
        
        // Kontrola, zda se hledaný text shoduje s kategorií
        const categoryMatch = categoryName.includes(searchTerm);
        
        items.forEach(item => {
            const itemName = item.dataset.itemName;
            const keywords = item.dataset.keywords;
            
            // Zobrazit item, pokud odpovídá kategorie, název itemu nebo keywords
            if (searchTerm === '' || categoryMatch || itemName.includes(searchTerm) || keywords.includes(searchTerm)) {
                item.classList.remove('hidden');
                hasVisibleItems = true;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Skrýt kategorii, pokud nemá žádné viditelné položky a neshoduje se s vyhledáváním
        if (searchTerm !== '' && !hasVisibleItems && !categoryMatch) {
            category.classList.add('hidden');
        } else {
            category.classList.remove('hidden');
        }
    });
}

loadCenik();