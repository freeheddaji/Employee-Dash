class DatabaseManager {
    constructor() {
        this.dbName = 'employeeDashboardDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stores for each section if they don't exist
                const stores = ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives', 'employeeList', 'settings'];
                
                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                        
                        // Create indices for common search fields
                        store.createIndex('matricule', 'matricule', { unique: false });
                        store.createIndex('nom_prenom', 'nom_prenom', { unique: false });
                        store.createIndex('createdAt', 'createdAt', { unique: false });
                    }
                });
            };
        });
    }

    async saveData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            // Clear existing data
            store.clear().onsuccess = () => {
                // Add new data
                const request = store.add(data);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            };

            transaction.oncomplete = () => {
                console.log(`Data saved successfully in ${storeName}`);
                resolve();
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async searchData(storeName, indexName, searchValue) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(searchValue);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPaginatedData(storeName, page, itemsPerPage) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            // Get total count
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                const totalItems = countRequest.result;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                
                // Calculate bounds
                const start = (page - 1) * itemsPerPage;
                let currentIndex = 0;
                const results = [];

                // Use a cursor to iterate through the records
                const cursorRequest = store.openCursor();
                
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (!cursor) {
                        resolve({
                            data: results,
                            totalItems,
                            totalPages,
                            currentPage: page
                        });
                        return;
                    }

                    if (currentIndex >= start && currentIndex < start + itemsPerPage) {
                        results.push(cursor.value);
                    } else if (currentIndex >= start + itemsPerPage) {
                        resolve({
                            data: results,
                            totalItems,
                            totalPages,
                            currentPage: page
                        });
                        return;
                    }

                    currentIndex++;
                    cursor.continue();
                };
                
                cursorRequest.onerror = () => reject(cursorRequest.error);
            };
            
            countRequest.onerror = () => reject(countRequest.error);
        });
    }

    async deleteData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getStoreSize(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
