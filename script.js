const PROXY_URL = 'https://script.google.com/macros/s/AKfycbwATUTIqB5rn9j24hrl5AaBuJgiJPksf8lKamo9_6a1G1wQqZWqLXa_Q2vjNa7LZ7tj-g/exec';

class MenuBuilder {
    constructor() {
        this.menuItems = [];
        this.init();
    }

    async init() {
        await this.loadMenuItems();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMenuItem();
        });
    }

    async loadMenuItems() {
        try {
            this.showStatus('Loading menu items...', 'info');
            
            const response = await fetch(`${PROXY_URL}?path=menu&action=get`);
            const data = await response.json();
            
            if (data.success) {
                this.menuItems = data.data;
                this.renderMenuItems();
                this.showStatus(`Loaded ${this.menuItems.length} menu items`, 'success');
            } else {
                this.showStatus('Error loading menu items: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error loading menu items:', error);
            this.showStatus('Error connecting to server. Please check your connection.', 'error');
        }
    }

    renderMenuItems() {
        const container = document.getElementById('menuItemsList');
        
        if (this.menuItems.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 8px;">
                    <h4>No menu items yet</h4>
                    <p>Add your first menu item using the form above!</p>
                </div>
            `;
            return;
        }

        const itemsByCategory = this.groupByCategory();
        let html = '';

        for (const [category, items] of Object.entries(itemsByCategory)) {
            html += `
                <div class="category-section">
                    <h4 class="category-header">${category}</h4>
                    ${items.map(item => this.renderMenuItem(item)).join('')}
                </div>
            `;
        }

        container.innerHTML = html;
        
        // Add event listeners
        this.menuItems.forEach(item => {
            const deleteBtn = document.getElementById(`delete-${item.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteMenuItem(item.id));
            }
            
            const toggleBtn = document.getElementById(`toggle-${item.id}`);
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggleAvailability(item.id));
            }
        });
    }

    renderMenuItem(item) {
        const availabilityClass = item.available ? 'available' : 'unavailable';
        const availabilityText = item.available ? 'Available' : 'Unavailable';
        
        return `
            <div class="menu-item ${availabilityClass}" id="item-${item.id}">
                <div class="item-info">
                    <h4>${item.name} - $${item.price.toFixed(2)}</h4>
                    ${item.description ? `<p>${item.description}</p>` : ''}
                    <div class="item-meta">
                        Category: ${item.category} | Status: ${availabilityText}
                        ${item.id ? ` | ID: ${item.id}` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn" onclick="editMenuItem('${item.id}')">Edit</button>
                    <button class="btn" id="toggle-${item.id}">
                        ${item.available ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn btn-danger" id="delete-${item.id}">Delete</button>
                </div>
            </div>
        `;
    }

    groupByCategory() {
        const groups = {};
        this.menuItems.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }

    async addMenuItem() {
        const form = document.getElementById('addItemForm');
        const formData = new FormData(form);
        
        const newItem = {
            name: document.getElementById('itemName').value.trim(),
            description: document.getElementById('itemDescription').value.trim(),
            price: parseFloat(document.getElementById('itemPrice').value),
            category: document.getElementById('itemCategory').value,
            available: document.getElementById('itemAvailable').checked,
            imageUrl: ''
        };

        // Validation
        if (!newItem.name) {
            this.showStatus('Please enter an item name', 'error');
            return;
        }

        if (!newItem.price || newItem.price <= 0) {
            this.showStatus('Please enter a valid price', 'error');
            return;
        }

        if (!newItem.category) {
            this.showStatus('Please select a category', 'error');
            return;
        }

        try {
            this.showStatus('Adding menu item...', 'info');
            
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: 'menu',
                    action: 'add',
                    data: newItem
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showStatus('Item added successfully!', 'success');
                await this.loadMenuItems(); // Reload the menu
                form.reset();
            } else {
                this.showStatus('Error adding item: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding item:', error);
            this.showStatus('Error adding item. Please try again.', 'error');
        }
    }

    async deleteMenuItem(itemId) {
        if (!confirm('Are you sure you want to delete this menu item? This action cannot be undone.')) {
            return;
        }

        try {
            this.showStatus('Deleting item...', 'info');
            
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: 'menu',
                    action: 'delete',
                    itemId: itemId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showStatus('Item deleted successfully!', 'success');
                await this.loadMenuItems(); // Reload the menu
            } else {
                this.showStatus('Error deleting item: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showStatus('Error deleting item. Please try again.', 'error');
        }
    }

    async toggleAvailability(itemId) {
        const item = this.menuItems.find(item => item.id === itemId);
        if (!item) return;

        const newAvailability = !item.available;
        
        try {
            this.showStatus('Updating item...', 'info');
            
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: 'menu',
                    action: 'update',
                    itemId: itemId,
                    data: {
                        ...item,
                        available: newAvailability
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showStatus(`Item ${newAvailability ? 'enabled' : 'disabled'}!`, 'success');
                await this.loadMenuItems(); // Reload the menu
            } else {
                this.showStatus('Error updating item: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error updating item:', error);
            this.showStatus('Error updating item. Please try again.', 'error');
        }
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
}

// Export/Import functions
async function exportMenu() {
    const menuBuilder = new MenuBuilder();
    await menuBuilder.loadMenuItems();
    
    const csvContent = convertToCSV(menuBuilder.menuItems);
    downloadCSV(csvContent, 'menu-export.csv');
}

function convertToCSV(items) {
    const headers = ['Name', 'Description', 'Price', 'Category', 'Available', 'ImageURL'];
    const csvRows = [headers.join(',')];
    
    items.forEach(item => {
        const row = [
            `"${item.name.replace(/"/g, '""')}"`,
            `"${(item.description || '').replace(/"/g, '""')}"`,
            item.price,
            `"${item.category}"`,
            item.available ? 'TRUE' : 'FALSE',
            `"${item.imageUrl || ''}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function importMenu() {
    document.getElementById('csvFile').click();
    
    document.getElementById('csvFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                // Parse CSV and implement import logic here
                alert('CSV import functionality would be implemented here');
            };
            reader.readAsText(file);
        }
    });
}

function editMenuItem(itemId) {
    alert('Edit functionality for item: ' + itemId + '\n\nThis would open an edit form in a real implementation.');
}

// Initialize the menu builder when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MenuBuilder();
});
