document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded'); // Debug log
    
    // Initialize database
    const db = new DatabaseManager();
    
    // Initialize backup manager after database is ready
    db.initDatabase().then(() => {
        const backupManager = new BackupManager(db);
    backupManager.initializeBackup();
    
    const initialState = {
        recrutement: [],
        mutation: [],
        doc_adm: [],
        depart: [],
        stc: [],
        employeeList: [],
        notifications: [],
        archives: [],
        settings: {
            type_contrat: ["CDI", "OP", "ANAPEC", "PCS"],
            nature_depart: ["Demission", "Fin de contrat", "Licenciement"],
            notification_type: ["Fin de contrat", "Fin de periode d'essai", "Suivi de document", "Autre"]
        }
    };
    
    // Force initial display of dashboard
    setTimeout(() => {
        const dashboardTab = document.querySelector('[data-tab="dashboard"]');
        if (dashboardTab) {
            dashboardTab.click();
        }
    }, 100);

    // --- State Management with IndexedDB ---
    let state = initialState;
    let filters = {};

    async function loadState() {
        try {
            // Wait for database initialization
            await db.initDatabase();
            
            // Load data for each store
            const stores = ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives', 'employeeList', 'settings'];
            
            for (const store of stores) {
                const data = await db.getData(store);
                if (data && data.length > 0) {
                    state[store] = data;
                }
            }
            
            return state;
        } catch (e) {
            console.error("Could not load state from IndexedDB", e);
            return initialState;
        }
    }

    async function saveState() {
        try {
            // Save each section to its respective store
            for (const [section, data] of Object.entries(state)) {
                if (Array.isArray(data)) {
                    await db.saveData(section, data);
                } else if (section === 'settings') {
                    await db.saveData(section, data);
                }
            }
            
            // Update UI to reflect successful save
            const saveIndicator = document.getElementById('save-indicator');
            if (saveIndicator) {
                saveIndicator.textContent = 'All changes saved';
                setTimeout(() => {
                    saveIndicator.textContent = '';
                }, 2000);
            }
        } catch (e) {
            console.error("Could not save state to IndexedDB", e);
            alert("An error occurred while saving. Please try again or export your data.");
        }
    }
    
    // Initialize state
    loadState().then(() => {
        console.log('State loaded successfully');
        // Force initial display of dashboard
        const dashboardTab = document.querySelector('[data-tab="dashboard"]');
        if (dashboardTab) {
            dashboardTab.click();
        }
    });

    // --- Form Handling Functions ---
    function handleFormSubmit(section, formData) {
        const newEntry = {};
        for (const [key, value] of formData.entries()) {
            newEntry[key] = value;
        }
        newEntry.id = Date.now().toString();
        newEntry.createdAt = new Date().toISOString();
        
        state[section].push(newEntry);
        saveState();
        renderTable(section);
    }

    // Initialize form submission listeners
    ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc'].forEach(section => {
        const form = document.querySelector(`#form-${section}`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleFormSubmit(section, formData);
                e.target.reset();
            });
        }
    });

    // Chart instances are managed in renderDashboard function

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentTab = null;
    
    const switchToTab = function(tabElement) {
        console.log('Switching to tab:', tabElement.dataset.tab); // Debug log
        
        // Prevent re-rendering if the same tab is clicked
        if (currentTab === tabElement.dataset.tab) {
            console.log('Tab already active:', currentTab);
            return;
        }
        
        currentTab = tabElement.dataset.tab;
        
        // Update tab buttons
        tabs.forEach(t => {
            t.classList.remove('active', 'border-blue-500', 'text-blue-600');
            t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        });
        
        tabElement.classList.add('active', 'border-blue-500', 'text-blue-600');
        tabElement.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

        // Hide all tab contents first
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.remove('active');
            c.style.display = 'none';
        });

        // Show the selected tab content
        const activeTab = document.getElementById(tabElement.dataset.tab);
        if (activeTab) {
            console.log('Activating tab content:', tabElement.dataset.tab); // Debug log
            activeTab.classList.add('active');
            activeTab.style.display = 'block';
            
            // Use requestAnimationFrame to ensure DOM is updated before rendering
            requestAnimationFrame(() => {
                // Render appropriate content based on tab
                switch(tabElement.dataset.tab) {
                    case 'dashboard':
                        renderDashboard();
                        break;
                    case 'recrutement':
                    case 'mutation':
                    case 'doc_adm':
                    case 'depart':
                    case 'stc':
                        renderTable(tabElement.dataset.tab);
                        break;
                }
            });
        } else {
            console.error('Tab content not found:', tabElement.dataset.tab); // Debug log
        }
    }

    // Add click handlers to tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchToTab(tab));
    });

    // Initialize the dashboard tab
    console.log('Initializing dashboard tab'); // Debug log
    const defaultTab = document.querySelector('.tab[data-tab="dashboard"]');
    if (defaultTab) {
        switchToTab(defaultTab);
    }

    // Setup backup event listeners
    document.getElementById('create-backup').addEventListener('click', () => {
        backupManager.createBackup();
    });

    // Function to refresh backup list
    function refreshBackupList() {
        const backupItems = document.getElementById('backup-items');
        const backups = backupManager.getBackupsList();
        
        backupItems.innerHTML = backups.map(backup => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span class="text-sm">${backup.date}</span>
                <div class="space-x-2">
                    <button onclick="restoreBackup(${backup.timestamp})" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        Restaurer
                    </button>
                    <button onclick="exportBackup(${backup.timestamp})"
                            class="text-green-600 hover:text-green-800 text-sm">
                        Exporter
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Global functions for backup actions
    window.restoreBackup = async (timestamp) => {
        if (confirm('Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) {
            await backupManager.restoreBackup(timestamp);
            location.reload(); // Reload page to reflect restored data
        }
    };

    window.exportBackup = (timestamp) => {
        backupManager.exportBackup(timestamp);
    };

    // Initial backup list population
    refreshBackupList();

    // Refresh backup list periodically
    setInterval(refreshBackupList, 5 * 60 * 1000); // Every 5 minutes

    // --- CSV Import Functionality ---
    document.getElementById('import-employee-list-btn').addEventListener('click', () => {
        document.getElementById('import-employee-list-input').click();
    });

    document.getElementById('import-employee-list-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvData = event.target.result;
                const lines = csvData.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                const employees = [];
                for(let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    
                    const values = lines[i].split(',').map(v => v.trim());
                    const employee = {};
                    headers.forEach((header, index) => {
                        employee[header] = values[index];
                    });
                    employees.push(employee);
                }
                
                state.employeeList = employees;
                saveState();
                alert('Liste des employés importée avec succès!');
            };
            reader.readAsText(file);
        }
    });

    // --- Dashboard Rendering ---
    // Store chart instances
    let charts = {
        recrutement: null,
        depart: null
    };

    function renderDashboard() {
        console.log('Rendering dashboard...'); // Debug log

        // Update statistics
        document.getElementById('total-recrutement').textContent = state.recrutement.length;
        document.getElementById('total-mutation').textContent = state.mutation.length;
        document.getElementById('total-depart').textContent = state.depart.length;
        document.getElementById('total-archives').textContent = state.archives.length;

        // Destroy existing charts
        if (charts.recrutement) {
            charts.recrutement.destroy();
            charts.recrutement = null;
        }
        if (charts.depart) {
            charts.depart.destroy();
            charts.depart = null;
        }

        // Render recruitment chart
        try {
            const recrutementCtx = document.getElementById('recrutementChart')?.getContext('2d');
            if (recrutementCtx) {
                const recrutementData = state.recrutement.reduce((acc, item) => {
                    acc[item.type_contrat] = (acc[item.type_contrat] || 0) + 1;
                    return acc;
                }, {});

                charts.recrutement = new Chart(recrutementCtx, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(recrutementData),
                        datasets: [{
                            label: 'Nombre de recrutements',
                            data: Object.values(recrutementData),
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            borderColor: 'rgba(59, 130, 246, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { 
                        scales: { y: { beginAtZero: true } },
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        } catch (error) {
            console.error('Error rendering recruitment chart:', error);
        }

        // Render departures chart
        try {
            const departCtx = document.getElementById('departChart')?.getContext('2d');
            if (departCtx) {
                const allDeparts = [...state.depart, ...state.archives];
                const departData = allDeparts.reduce((acc, item) => {
                    const nature = item.nature_depart || 'Non specifie';
                    acc[nature] = (acc[nature] || 0) + 1;
                    return acc;
                }, {});

                charts.depart = new Chart(departCtx, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(departData),
                        datasets: [{
                            label: 'Nature de depart',
                            data: Object.values(departData),
                            backgroundColor: [
                                'rgba(255, 99, 132, 0.5)',
                                'rgba(54, 162, 235, 0.5)',
                                'rgba(255, 206, 86, 0.5)',
                                'rgba(75, 192, 192, 0.5)',
                                'rgba(153, 102, 255, 0.5)',
                            ],
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        } catch (error) {
            console.error('Error rendering departures chart:', error);
        }
    }

    // --- Search and Filter Logic ---
    function applyFilters(section) {
        if (!state[section]) return;
        let filteredData = [...(state[section])];
        const searchTerm = filters[section]?.search?.toLowerCase() || '';

        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(searchTerm)
                )
            );
        }
        
        if (filters[section]?.specific) {
            for (const key in filters[section].specific) {
                const value = filters[section].specific[key];
                if (value) {
                    filteredData = filteredData.filter(item => item[key] === value);
                }
            }
        }
        
        renderTable(section, filteredData);
    }

    function populateFilterOptions(section, key) {
        const select = document.getElementById(`filter-${key}-${section}`);
        if (!select || !state[section]) return;

        const options = [...new Set(state[section].map(item => item[key]))];
        select.innerHTML = '<option value="">Tous</option>';
        options.forEach(option => {
            if(option) {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                select.appendChild(opt);
            }
        });
    }
    
    window.toggleFilter = function(section) {
        const dropdown = document.getElementById(`filter-${section}`);
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    }

    // --- Generic CRUD and Rendering Logic ---
    function initializeSection(section) {
        // Initialize filters if they exist
        const filterDropdown = document.getElementById(`filter-${section}`);
        if (filterDropdown) {
            const selects = filterDropdown.querySelectorAll('select');
            selects.forEach(select => {
                const key = select.id.split('-')[1];
                populateFilterOptions(section, key);
            });
        }
        
        // Initialize search if it exists
        const searchInput = document.getElementById(`search-${section}`);
        if (searchInput) {
            searchInput.value = ''; // Clear any previous search
        }
        
        // Render the table
        renderTable(section);
    }

    // Pagination state
    const paginationState = {
        currentPage: 1,
        itemsPerPage: 20,
        totalPages: 1
    };

    function renderTable(section, dataToRender) {
        console.log('Rendering table for section:', section); // Debug log
        const tableContainer = document.querySelector(`#table-${section}`);
        if (!tableContainer) return;

        let tableHTML = '';
        const allData = dataToRender || state[section] || [];
        
        // Calculate pagination
        paginationState.totalPages = Math.ceil(allData.length / paginationState.itemsPerPage);
        const startIndex = (paginationState.currentPage - 1) * paginationState.itemsPerPage;
        const endIndex = startIndex + paginationState.itemsPerPage;
        const data = allData.slice(startIndex, endIndex);
        
        if (allData.length === 0) {
            const colSpan = document.querySelector(`#form-${section}`)?.elements.length || 10;
            const headerHTML = section === 'archives' ? document.getElementById('table-depart').querySelector('thead')?.innerHTML.replace('Action', '') : document.getElementById(`table-${section}`)?.querySelector('thead')?.innerHTML;
            tableContainer.innerHTML = `<thead class="text-xs text-gray-700 uppercase bg-gray-100">${headerHTML || ''}</thead><tbody><tr><td colspan="${colSpan}" class="text-center p-4 text-gray-500">Aucune donnee a afficher.</td></tr></tbody>`;
            return;
        }

        // Add loading state
        if (allData.length > 1000) {
            tableContainer.classList.add('loading');
        }
        
        const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt');
        const headers = keys.map(k => `<th class="px-6 py-3">${k.replace(/_/g, ' ')}</th>`).join('');
        
        const baseHeaders = {
            recrutement: `<th>ID Embauche</th><th>Matricule</th><th>Nom/Prenom</th><th>CIN</th><th>Fonction Reel</th><th>Fonction AGIRH</th><th>Date Debut</th><th>Site</th><th>Remuneration</th><th>Telephone</th><th>Type Contrat</th><th>Envoi Donnees</th><th>Date Envoi</th><th>CNSS</th><th>Bulletin Adhesion</th><th>OBS</th>`,
            mutation: `<th>Matricule</th><th>Nom/Prenom</th><th>Site Actuel</th><th>Site Futur</th><th>Fonction</th><th>Fonction AGIRH</th><th>Date Mutation</th><th>OBS</th>`,
            doc_adm: `<th>Matricule</th><th>Nom/Prenom</th><th>Site</th><th>Type Contrat</th><th>Fonction</th><th>Droit Paie</th><th>Docs Demandes</th><th>Observations</th><th>Date</th>`,
            depart: `<th>Region</th><th>Matricule</th><th>Nom/Prenom</th><th>Fonction</th><th>Fonction AGIRH</th><th>Date Integration</th><th>Site</th><th>Date Depart</th><th>Nature Depart</th><th>Motif Depart</th><th>Type Contrat</th><th>Observation</th><th>Justif Depose</th><th>Preavis</th>`,
            stc: `<th>Site</th><th>Matricule</th><th>Nom/Prenom</th><th>Fonction</th><th>Date Depart</th><th>STC Magasin</th><th>STC WAFAA</th><th>Date d'Envoi</th>`
        };
        
        tableHTML += `<thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr>`;
        tableHTML += (baseHeaders[section] || headers);
        if (section !== 'archives') {
            tableHTML += `<th class="px-6 py-3">Action</th>`;
        }
        tableHTML += `</tr></thead><tbody>`;

        const keyOrder = {
             recrutement: ['id_embauche', 'matricule', 'nom_prenom', 'cin', 'fonction_reel', 'fonction_agirh', 'date_debut', 'site', 'remuneration', 'telephone', 'type_contrat', 'envoi_donnes', 'date_envoi_donnes', 'cnss', 'bulletin_adhesion', 'obs'],
            mutation: ['matricule', 'nom_prenom', 'site_actuel', 'site_futur', 'fonction', 'fonction_agirh', 'date_mutation', 'obs'],
            doc_adm: ['matricule', 'nom_prenom', 'site', 'type_contrat', 'fonction', 'droit_paie', 'doc_demandes', 'observations', 'date'],
            depart: ['region', 'matricule', 'nom_prenom', 'fonction', 'fonction_agirh', 'date_integration', 'site', 'date_depart', 'nature_depart', 'motif_depart', 'type_contrat', 'observation', 'justif_depose', 'preavis'],
            stc: ['site', 'matricule', 'nom_prenom', 'fonction', 'date_depart', 'stc_magasin', 'stc_wafaa', 'date_envoi'],
            archives: ['region', 'matricule', 'nom_prenom', 'fonction', 'fonction_agirh', 'date_integration', 'site', 'date_depart', 'nature_depart', 'motif_depart', 'type_contrat', 'observation', 'justif_depose', 'preavis']
        };

        data.forEach(item => {
            tableHTML += `<tr class="bg-white border-b" data-id="${item.id}">`;
            const keysToRender = keyOrder[section] || keys;
            keysToRender.forEach(key => {
                tableHTML += `<td class="px-6 py-4">${item[key] || '-'}</td>`;
            });

            if (section !== 'archives') {
                tableHTML += `<td class="px-6 py-4 flex items-center space-x-4">
                    <button onclick="openEditModal('${section}', ${item.id})" class="text-blue-600 hover:text-blue-800 font-medium">Modifier</button>
                    <button onclick="deleteItem('${section}', ${item.id})" class="text-red-600 hover:text-red-800 font-medium">Supprimer</button>
                    ${section === 'depart' ? `<button onclick="archiveItem(${item.id})" class="text-gray-600 hover:text-gray-800 font-medium">Archiver</button>` : ''}
                </td>`;
            }
            tableHTML += `</tr>`;
        });

        tableHTML += `</tbody>`;
        
        // Add pagination controls if needed
        if (paginationState.totalPages > 1) {
            tableHTML += `
                <tfoot>
                    <tr>
                        <td colspan="100%" class="px-6 py-4">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-gray-700">
                                    Showing ${startIndex + 1} to ${Math.min(endIndex, allData.length)} of ${allData.length} entries
                                </div>
                                <div class="flex space-x-2">
                                    <button onclick="changePage(${section}, 'prev')" 
                                            class="px-3 py-1 border rounded ${paginationState.currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
                                            ${paginationState.currentPage === 1 ? 'disabled' : ''}>
                                        Previous
                                    </button>
                                    <span class="px-3 py-1">Page ${paginationState.currentPage} of ${paginationState.totalPages}</span>
                                    <button onclick="changePage(${section}, 'next')"
                                            class="px-3 py-1 border rounded ${paginationState.currentPage === paginationState.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}"
                                            ${paginationState.currentPage === paginationState.totalPages ? 'disabled' : ''}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tfoot>`;
        }
        
        tableContainer.innerHTML = tableHTML;
        tableContainer.classList.remove('loading');
    }

    // Pagination handler
    window.changePage = function(section, direction) {
        if (direction === 'prev' && paginationState.currentPage > 1) {
            paginationState.currentPage--;
        } else if (direction === 'next' && paginationState.currentPage < paginationState.totalPages) {
            paginationState.currentPage++;
        }
        renderTable(section);
    }

    function handleFormSubmit(event, section) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const newItem = { 
            id: Date.now(),
            createdAt: new Date().toISOString()
        };
        for (let [key, value] of formData.entries()) {
            newItem[key] = value;
        }
        if (!state[section]) state[section] = [];
        state[section].push(newItem);
        saveState();
        applyFilters(section);
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
        form.reset();
    }

    function deleteItem(section, id) {
        if (confirm('Etes-vous sur de vouloir supprimer cette entree ?')) {
            state[section] = state[section].filter(item => item.id !== id);
            saveState();
            applyFilters(section);
            if (document.getElementById('dashboard').classList.contains('active')) {
                renderDashboard();
            }
        }
    }
    
    // --- Enhanced Autocomplete Logic ---
    function setupAutocomplete(form) {
        const matriculeInput = form.querySelector('input[name="matricule"]');
        if (!matriculeInput) return;

        matriculeInput.addEventListener('change', () => {
            const matriculeValue = matriculeInput.value.trim();
            const employee = state.employeeList.find(emp => emp.matricule === matriculeValue);

            Array.from(form.elements).forEach(el => {
                if (el.name !== 'matricule') el.value = '';
            });

            if (employee) {
                for (const key in employee) {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input && key !== 'matricule') {
                        input.value = employee[key];
                    }
                }
            }
        });
    }

    // --- Initial setup and event listeners ---
    const sections = ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives'];
    sections.forEach(section => {
        filters[section] = { search: '', specific: {} };
        const form = document.getElementById(`form-${section}`);
        if(form) {
            form.addEventListener('submit', (e) => handleFormSubmit(e, section));
            setupAutocomplete(form);
        }
        
        const importInput = document.getElementById(`import-${section}`);
        if(importInput) {
             importInput.addEventListener('change', (e) => handleFileUpload(e, section));
        }

        const searchInput = document.getElementById(`search-${section}`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filters[section].search = e.target.value;
                applyFilters(section);
            });
        }
        
        const filterDropdown = document.getElementById(`filter-${section}`);
        if (filterDropdown) {
             const selects = filterDropdown.querySelectorAll('select');
             selects.forEach(select => {
                const key = select.id.split('-')[1];
                 filters[section].specific[key] = '';
                 populateFilterOptions(section, key);
                 select.addEventListener('change', (e) => {
                    filters[section].specific[key] = e.target.value;
                    applyFilters(section);
                });
             });
        }
    });

    // --- Modal Logic ---
    const editModal = document.getElementById('editModal');
    const closeModalBtn = document.getElementById('closeModal');
    const saveChangesBtn = document.getElementById('saveChanges');
    const editForm = document.getElementById('editForm');
    let currentEditInfo = { section: null, id: null };

    window.openEditModal = function(section, id) {
        currentEditInfo = { section, id };
        const item = state[section].find(i => i.id === id);
        const originalForm = document.getElementById(`form-${section}`);

        editForm.innerHTML = '';
        Array.from(originalForm.elements).forEach(el => {
            if (el.tagName !== 'BUTTON') {
                const newEl = el.cloneNode(true);
                newEl.value = item[el.name] || '';
                editForm.appendChild(newEl);
            }
        });
        editModal.classList.remove('hidden');
    }

    closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    saveChangesBtn.addEventListener('click', () => {
        const { section, id } = currentEditInfo;
        const itemIndex = state[section].findIndex(i => i.id === id);
        if (itemIndex === -1) return;

        const formData = new FormData(editForm);
        const updatedValues = {};
        for (let [key, value] of formData.entries()) {
            updatedValues[key] = value;
        }

        state[section][itemIndex] = { ...state[section][itemIndex], ...updatedValues };
        saveState();
        applyFilters(section);
        if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
        editModal.classList.add('hidden');
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
            editModal.classList.add('hidden');
        }
    });

    // --- Deadline Alert ---
    function checkDeadlineAlert() {
        if (new Date().getDate() === 15) {
            document.getElementById('deadline-alert').classList.remove('hidden');
        }
    }

    // --- Master Employee List Import ---
    document.getElementById('import-employee-list-btn').addEventListener('click', () => document.getElementById('import-employee-list-input').click());
    document.getElementById('import-employee-list-input').addEventListener('change', (event) => {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line);
            if (lines.length < 2) { alert("Fichier CSV invalide."); return; }
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace(/[éè]/g, 'e'));
            const employeeList = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                let employee = {};
                let hasMatricule = false;
                headers.forEach((header, index) => {
                    let key = header.replace('nom_et_prenom', 'nom_prenom').replace('numero_de_telephone', 'telephone');
                    if (key === 'matricule' && values[index]) hasMatricule = true;
                    employee[key] = values[index];
                });
                if(hasMatricule) employeeList.push(employee);
            }
            state.employeeList = employeeList;
            saveState();
            alert(`${employeeList.length} employes importes.`);
        };
        reader.readAsText(file); event.target.value = '';
    });

    // --- Daily Report Generation ---
    document.getElementById('generate-daily-report-btn').addEventListener('click', () => {
        const today = new Date().toISOString().slice(0, 10);
        let dailyEntries = [];
        ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc'].forEach(section => {
            if (state[section]?.length > 0) {
                state[section].filter(item => item.createdAt?.slice(0, 10) === today)
                               .forEach(entry => dailyEntries.push({ Section: section, ...entry }));
            }
        });
        if (dailyEntries.length === 0) { alert("Aucune nouvelle entree pour aujourd'hui."); return; }
        exportToCsv(`Rapport_Journalier_${today}.csv`, null, dailyEntries);
    });

    // --- Employee Profile Logic ---
    document.getElementById('form-profil-search').addEventListener('submit', (e) => {
        e.preventDefault();
        const matricule = document.getElementById('search-matricule-profil').value.trim();
        if (matricule) displayEmployeeProfile(matricule);
    });

    function displayEmployeeProfile(matricule) {
        let history = [];
        const employeeInfo = state.employeeList.find(emp => emp.matricule === matricule);
        ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives'].forEach(section => {
            if (state[section]?.length > 0) {
                state[section].filter(item => item.matricule === matricule).forEach(record => {
                    let date, title;
                    switch(section) {
                        case 'recrutement': date = record.date_debut; title = "Recrutement"; break;
                        case 'mutation': date = record.date_mutation; title = "Mutation"; break;
                        case 'doc_adm': date = record.date; title = `Document: ${record.doc_demandes || ''}`; break;
                        case 'depart': case 'archives': date = record.date_depart; title = `Depart ${section==='archives'?'(Archive)':''}`; break;
                        case 'stc': date = record.date_depart; title = "Suivi STC"; break;
                    }
                    if (date) history.push({ date, title, eventData: record });
                });
            }
        });
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        const profileContent = document.getElementById('profil-content');
        if (!employeeInfo && history.length === 0) {
            profileContent.innerHTML = `<p class="text-red-500">Aucun employe trouve : ${matricule}</p>`; return;
        }
        let profileHTML = `<div class="mb-6"><h3 class="text-2xl font-bold">${employeeInfo?.nom_prenom || history[0]?.eventData.nom_prenom || 'N/A'}</h3>
            <p class="text-gray-600">Matricule: ${matricule}</p>
            ${employeeInfo?.fonction ? `<p class="text-gray-600">Fonction: ${employeeInfo.fonction}</p>` : ''}
            ${employeeInfo?.site ? `<p class="text-gray-600">Site: ${employeeInfo.site}</p>` : ''}</div><div class="timeline">`;
        if (history.length > 0) {
            history.forEach(item => {
                let detailsHTML = '<ul class="list-disc list-inside text-sm text-gray-700">';
                for (const [key, value] of Object.entries(item.eventData)) {
                    if (!['id', 'createdAt', 'matricule', 'nom_prenom'].includes(key) && value) {
                        detailsHTML += `<li><strong class="font-medium">${key.replace(/_/g, ' ')}:</strong> ${value}</li>`;
                    }
                }
                detailsHTML += '</ul>';
                profileHTML += `<div class="timeline-item"><div class="timeline-dot"></div><p class="timeline-date">${new Date(item.date).toLocaleDateString()}</p><h4 class="timeline-title">${item.title}</h4><div class="timeline-content">${detailsHTML}</div></div>`;
            });
        } else { profileHTML += `<p class="text-gray-500">Aucun evenement historique.</p>`; }
        profileContent.innerHTML = profileHTML + '</div>';
    }

    // --- Notifications Logic ---
    document.getElementById('form-notification').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const newNotification = { id: Date.now() };
        for (let [key, value] of formData.entries()) newNotification[key] = value;
        state.notifications.push(newNotification);
        saveState(); renderNotifications(); form.reset();
    });

    function renderNotifications() {
        const overdueContainer = document.getElementById('overdue-alerts');
        const upcomingContainer = document.getElementById('upcoming-alerts');
        overdueContainer.innerHTML = ''; upcomingContainer.innerHTML = '';
        let alertCount = 0; const today = new Date(); today.setHours(0, 0, 0, 0);
        state.notifications.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).forEach(notif => {
            const dueDate = new Date(notif.dueDate);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays > 7) return;
            const employee = state.employeeList.find(e => e.matricule === notif.matricule) || { nom_prenom: 'N/A' };
            const isOverdue = diffDays < 0;
            const cardHTML = `<div class="p-4 rounded-lg shadow-sm flex justify-between items-start ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border">
                <div><p class="font-semibold">${notif.type} - ${employee.nom_prenom}</p><p class="text-sm text-gray-600">Matricule: ${notif.matricule}</p><p class="text-sm text-gray-600">Echeance: ${new Date(notif.dueDate).toLocaleDateString()}</p>${notif.notes ? `<p class="text-sm text-gray-500 mt-1"><i>Note: ${notif.notes}</i></p>`: ''}</div>
                <button onclick="deleteNotification(${notif.id})" class="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button></div>`;
            if (isOverdue) overdueContainer.innerHTML += cardHTML; else upcomingContainer.innerHTML += cardHTML;
            alertCount++;
        });
        if (!overdueContainer.innerHTML) overdueContainer.innerHTML = '<p class="text-gray-500">Aucune alerte en retard.</p>';
        if (!upcomingContainer.innerHTML) upcomingContainer.innerHTML = '<p class="text-gray-500">Aucune echeance a venir.</p>';
        const badge = document.getElementById('notification-badge');
        if (alertCount > 0) { badge.textContent = alertCount; badge.classList.remove('hidden'); }
        else { badge.classList.add('hidden'); }
    }
    window.deleteNotification = function(id) {
        state.notifications = state.notifications.filter(n => n.id !== id);
        saveState(); renderNotifications();
    }

    // --- Archiving Logic ---
    window.archiveItem = function(id) {
        const itemIndex = state.depart.findIndex(item => item.id === id); if (itemIndex === -1) return;
        const [itemToArchive] = state.depart.splice(itemIndex, 1);
        state.archives.push(itemToArchive);
        saveState(); applyFilters('depart'); applyFilters('archives'); renderDashboard();
    }

    // --- Settings Logic ---
    function renderSettingsList(settingKey) {
        const listElement = document.getElementById(`list-${settingKey}`);
        if (!listElement) return;
        listElement.innerHTML = '';
        state.settings[settingKey].forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
            li.textContent = item;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500 hover:text-red-700 font-bold px-2';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => deleteSetting(settingKey, item);
            li.appendChild(deleteBtn);
            listElement.appendChild(li);
        });
    }

    function addSetting(settingKey, value) {
        if (value && !state.settings[settingKey].includes(value)) {
            state.settings[settingKey].push(value);
            saveState();
            renderSettingsList(settingKey);
            populateAllDropdowns();
        }
    }

    function deleteSetting(settingKey, value) {
        state.settings[settingKey] = state.settings[settingKey].filter(item => item !== value);
        saveState();
        renderSettingsList(settingKey);
        populateAllDropdowns();
    }
    
    document.getElementById('form-settings-type_contrat').addEventListener('submit', e => { e.preventDefault(); addSetting('type_contrat', e.target.settingValue.value.trim()); e.target.reset(); });
    document.getElementById('form-settings-nature_depart').addEventListener('submit', e => { e.preventDefault(); addSetting('nature_depart', e.target.settingValue.value.trim()); e.target.reset(); });
    document.getElementById('form-settings-notification_type').addEventListener('submit', e => { e.preventDefault(); addSetting('notification_type', e.target.settingValue.value.trim()); e.target.reset(); });

    function populateDropdown(selectElement, options) {
        if (!selectElement) return;
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        if (firstOption && firstOption.disabled) selectElement.appendChild(firstOption);
        options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText; option.textContent = optionText;
            selectElement.appendChild(option);
        });
    }

    function populateAllDropdowns() {
        populateDropdown(document.querySelector('#form-recrutement select[name="type_contrat"]'), state.settings.type_contrat);
        populateDropdown(document.querySelector('#form-doc_adm select[name="type_contrat"]'), state.settings.type_contrat);
        populateDropdown(document.querySelector('#form-depart select[name="type_contrat"]'), state.settings.type_contrat);
        populateDropdown(document.querySelector('#filter-type_contrat-recrutement'), state.settings.type_contrat);
        populateDropdown(document.querySelector('#form-depart select[name="nature_depart"]'), state.settings.nature_depart);
        populateDropdown(document.querySelector('#form-notification select[name="type"]'), state.settings.notification_type);
    }


    // --- Initial Full Load ---
    function init() {
        renderDashboard();
        checkDeadlineAlert();
        renderNotifications();
        Object.keys(state.settings).forEach(key => renderSettingsList(key));
        populateAllDropdowns();
        sections.forEach(section => applyFilters(section));
    }

    init();
}); // Close DOMContentLoaded
}); // Close outer function