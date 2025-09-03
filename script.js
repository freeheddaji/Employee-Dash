document.addEventListener('DOMContentLoaded', function() {
    
    const initialState = {
        recrutement: [],
        mutation: [],
        doc_adm: [],
        depart: [],
        stc: [],
        employeeList: [],
        notifications: [],
        archives: []
    };

    // --- State Management with localStorage ---
    let state = loadState();
    let filters = {};

    function loadState() {
        try {
            const serializedState = localStorage.getItem('employeeDashboardState');
            if (serializedState === null) {
                return initialState;
            }
            const loadedState = JSON.parse(serializedState);
            // Ensure all keys exist to prevent errors on new features
            for (const key in initialState) {
                if (!loadedState.hasOwnProperty(key)) {
                    loadedState[key] = initialState[key];
                }
            }
            return loadedState;
        } catch (e) {
            console.error("Could not load state from localStorage", e);
            return initialState;
        }
    }

    function saveState() {
        try {
            const serializedState = JSON.stringify(state);
            localStorage.setItem('employeeDashboardState', serializedState);
        } catch (e) {
            console.error("Could not save state to localStorage", e);
        }
    }


    let charts = {};

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
            tabs.forEach(t => t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300'));
            
            tab.classList.add('active', 'border-blue-500', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

            const activeTab = document.getElementById(tab.dataset.tab)
            tabContents.forEach(c => c.classList.remove('active'));
            if(activeTab) {
               activeTab.classList.add('active');
            }
            
            if (tab.dataset.tab === 'dashboard') {
                renderDashboard();
            }
        });
    });

    // --- Dashboard Rendering ---
    function renderDashboard() {
        document.getElementById('total-recrutement').textContent = state.recrutement.length;
        document.getElementById('total-mutation').textContent = state.mutation.length;
        document.getElementById('total-depart').textContent = state.depart.length;
        document.getElementById('total-archives').textContent = state.archives.length;

        const recrutementCtx = document.getElementById('recrutementChart').getContext('2d');
        const recrutementData = state.recrutement.reduce((acc, item) => {
            acc[item.type_contrat] = (acc[item.type_contrat] || 0) + 1;
            return acc;
        }, {});
        
        if (charts.recrutement) charts.recrutement.destroy();
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
            options: { scales: { y: { beginAtZero: true } } }
        });

        const departCtx = document.getElementById('departChart').getContext('2d');
        const allDeparts = [...state.depart, ...state.archives];
        const departData = allDeparts.reduce((acc, item) => {
            const nature = item.nature_depart || 'Non specifie';
            acc[nature] = (acc[nature] || 0) + 1;
            return acc;
        }, {});

        if (charts.depart) charts.depart.destroy();
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
            }
        });
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
    function renderTable(section, dataToRender) {
        const tableContainer = document.querySelector(`#table-${section}`);
        if (!tableContainer) return;

        let tableHTML = '';
        const data = dataToRender || state[section] || [];
        
        if (data.length === 0) {
            tableContainer.innerHTML = `<p class="text-gray-500 p-4">Aucune donnee a afficher.</p>`;
            return;
        }
        
        const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt');
        const headers = keys.map(k => `<th class="px-6 py-3">${k.replace(/_/g, ' ')}</th>`).join('');
        
        const departHeaders = `
            <th class="px-6 py-3">Region</th><th class="px-6 py-3">Matricule</th><th class="px-6 py-3">Nom/Prenom</th><th class="px-6 py-3">Fonction</th>
            <th class="px-6 py-3">Fonction AGIRH</th><th class="px-6 py-3">Date Integration</th><th class="px-6 py-3">Site</th><th class="px-6 py-3">Date Depart</th>
            <th class="px-6 py-3">Nature Depart</th><th class="px-6 py-3">Motif Depart</th><th class="px-6 py-3">Type Contrat</th><th class="px-6 py-3">Observation</th>
            <th class="px-6 py-3">Justif Depose</th><th class="px-6 py-3">Preavis</th><th class="px-6 py-3">Action</th>`;
        
        tableHTML += `<thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr>`;
        if (section === 'depart' || section === 'archives') {
             // Use specific headers for depart and archives to maintain order and content
            tableHTML += departHeaders.replace('<th class="px-6 py-3">Action</th>', section === 'depart' ? '<th class="px-6 py-3">Action</th>' : '');
        } else {
            tableHTML += headers + `<th class="px-6 py-3">Action</th>`;
        }
        tableHTML += `</tr></thead><tbody>`;

        const departKeys = ['region', 'matricule', 'nom_prenom', 'fonction', 'fonction_agirh', 'date_integration', 'site', 'date_depart', 'nature_depart', 'motif_depart', 'type_contrat', 'observation', 'justif_depose', 'preavis'];

        data.forEach(item => {
            tableHTML += `<tr class="bg-white border-b" data-id="${item.id}">`;
            const keysToRender = (section === 'depart' || section === 'archives') ? departKeys : keys;
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
        tableContainer.innerHTML = tableHTML;
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
                if (el.name !== 'matricule') {
                    el.value = '';
                }
            });

            if (employee) {
                for (const key in employee) {
                    const input = form.querySelector(`input[name="${key}"], select[name="${key}"]`);
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

        applyFilters(section);
    });

    // --- Modal Logic ---
    const editModal = document.getElementById('editModal');
    const closeModalBtn = document.getElementById('closeModal');
    const saveChangesBtn = document.getElementById('saveChanges');
    const editForm = document.getElementById('editForm');
    const modalTitle = document.getElementById('modal-title');
    let currentEditInfo = { section: null, id: null };

    function openEditModal(section, id) {
        currentEditInfo = { section, id };
        const item = state[section].find(i => i.id === id);
        const originalForm = document.getElementById(`form-${section}`);

        modalTitle.textContent = `Modifier l'entree`;
        editForm.innerHTML = '';

        Array.from(originalForm.elements).forEach(el => {
            if (el.name) {
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
        if (document.getElementById('dashboard').classList.contains('active')) {
            renderDashboard();
        }
        editModal.classList.add('hidden');
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
            editModal.classList.add('hidden');
        }
    });

    // --- Deadline Alert ---
    function checkDeadlineAlert() {
        const today = new Date();
        if (today.getDate() === 15) {
            document.getElementById('deadline-alert').classList.remove('hidden');
        }
    }

    // --- Master Employee List Import ---
    const importEmployeeListBtn = document.getElementById('import-employee-list-btn');
    const importEmployeeListInput = document.getElementById('import-employee-list-input');
    
    importEmployeeListBtn.addEventListener('click', () => importEmployeeListInput.click());
    importEmployeeListInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line);
            if (lines.length < 2) {
                alert("Fichier CSV invalide ou vide.");
                return;
            }

            const headers = lines[0].split(',').map(h => 
                h.trim().toLowerCase().replace(/"/g, '').replace(/ /g, '_').replace('é', 'e').replace('è', 'e')
            );

            const employeeList = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                let employee = {};
                let hasMatricule = false;
                headers.forEach((header, index) => {
                    let key = header.replace('nom_et_prenom', 'nom_prenom').replace('numero_de_telephone', 'telephone');
                    if (key === 'matricule' && values[index]) {
                        hasMatricule = true;
                    }
                    employee[key] = values[index];
                });
                if(hasMatricule) {
                    employeeList.push(employee);
                }
            }
            
            state.employeeList = employeeList;
            saveState();
            alert(`${employeeList.length} employes importes avec succes.`);
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    // --- Daily Report Generation ---
    document.getElementById('generate-daily-report-btn').addEventListener('click', () => {
        const today = new Date().toISOString().slice(0, 10);
        let dailyEntries = [];

        ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc'].forEach(section => {
            if (state[section] && state[section].length > 0) {
                const todaySectionEntries = state[section].filter(item => item.createdAt && item.createdAt.slice(0, 10) === today);
                todaySectionEntries.forEach(entry => {
                    dailyEntries.push({ Section: section, ...entry });
                });
            }
        });

        if (dailyEntries.length === 0) {
            alert("Aucune nouvelle entree pour aujourd'hui.");
            return;
        }

        exportToCsv(`Rapport_Journalier_${today}.csv`, null, dailyEntries);
    });

    // --- Employee Profile Logic ---
    document.getElementById('form-profil-search').addEventListener('submit', (e) => {
        e.preventDefault();
        const matricule = document.getElementById('search-matricule-profil').value.trim();
        if (matricule) {
            displayEmployeeProfile(matricule);
        }
    });

    function displayEmployeeProfile(matricule) {
        let history = [];
        const employeeInfo = state.employeeList.find(emp => emp.matricule === matricule);

        ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives'].forEach(section => {
            if (state[section] && state[section].length > 0) {
                const records = state[section].filter(item => item.matricule === matricule);
                records.forEach(record => {
                    let date, title;
                    switch(section) {
                        case 'recrutement': date = record.date_debut; title = "Recrutement"; break;
                        case 'mutation': date = record.date_mutation; title = "Mutation"; break;
                        case 'doc_adm': date = record.date; title = `Document: ${record.doc_demandes || ''}`; break;
                        case 'depart': date = record.date_depart; title = "Depart"; break;
                        case 'stc': date = record.date_depart; title = "Suivi STC"; break;
                        case 'archives': date = record.date_depart; title = "Depart (Archive)"; break;
                    }
                    if (date) history.push({ date, title, eventData: record });
                });
            }
        });

        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const profileContent = document.getElementById('profil-content');
        profileContent.innerHTML = '';

        if (!employeeInfo && history.length === 0) {
            profileContent.innerHTML = `<p class="text-red-500">Aucun employe trouve pour le matricule : ${matricule}</p>`;
            return;
        }

        let profileHTML = `<div class="mb-6">
                <h3 class="text-2xl font-bold">${employeeInfo?.nom_prenom || history[0]?.eventData.nom_prenom || 'N/A'}</h3>
                <p class="text-gray-600">Matricule: ${matricule}</p>
                ${employeeInfo?.fonction ? `<p class="text-gray-600">Fonction: ${employeeInfo.fonction}</p>` : ''}
                ${employeeInfo?.site ? `<p class="text-gray-600">Site: ${employeeInfo.site}</p>` : ''}
            </div><div class="timeline">`;

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
        } else {
             profileHTML += `<p class="text-gray-500">Aucun evenement historique trouve.</p>`;
        }
        
        profileHTML += '</div>';
        profileContent.innerHTML = profileHTML;
    }

    // --- Notifications Logic ---
    document.getElementById('form-notification').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const newNotification = { id: Date.now() };
        for (let [key, value] of formData.entries()) newNotification[key] = value;
        state.notifications.push(newNotification);
        saveState();
        renderNotifications();
        form.reset();
    });

    function renderNotifications() {
        const overdueContainer = document.getElementById('overdue-alerts');
        const upcomingContainer = document.getElementById('upcoming-alerts');
        overdueContainer.innerHTML = '';
        upcomingContainer.innerHTML = '';
        let alertCount = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const sortedNotifications = state.notifications.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

        sortedNotifications.forEach(notif => {
            const dueDate = new Date(notif.dueDate);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays > 7) return;

            const employee = state.employeeList.find(e => e.matricule === notif.matricule) || { nom_prenom: 'N/A' };
            const isOverdue = diffDays < 0;
            const cardHTML = `<div class="p-4 rounded-lg shadow-sm flex justify-between items-start ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border">
                    <div>
                        <p class="font-semibold">${notif.type} - ${employee.nom_prenom}</p>
                        <p class="text-sm text-gray-600">Matricule: ${notif.matricule}</p>
                        <p class="text-sm text-gray-600">Echeance: ${new Date(notif.dueDate).toLocaleDateString()}</p>
                        ${notif.notes ? `<p class="text-sm text-gray-500 mt-1"><i>Note: ${notif.notes}</i></p>`: ''}
                    </div>
                    <button onclick="deleteNotification(${notif.id})" class="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
                </div>`;
            
            if (isOverdue) overdueContainer.innerHTML += cardHTML;
            else upcomingContainer.innerHTML += cardHTML;
            alertCount++;
        });

        if (!overdueContainer.innerHTML) overdueContainer.innerHTML = '<p class="text-gray-500">Aucune alerte en retard.</p>';
        if (!upcomingContainer.innerHTML) upcomingContainer.innerHTML = '<p class="text-gray-500">Aucune echeance a venir.</p>';
        
        const badge = document.getElementById('notification-badge');
        if (alertCount > 0) {
            badge.textContent = alertCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    window.deleteNotification = function(id) {
        state.notifications = state.notifications.filter(n => n.id !== id);
        saveState();
        renderNotifications();
    }

    // --- Archiving Logic ---
    window.archiveItem = function(id) {
        const itemIndex = state.depart.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        const [itemToArchive] = state.depart.splice(itemIndex, 1);
        state.archives.push(itemToArchive);
        
        saveState();
        applyFilters('depart');
        applyFilters('archives');
        renderDashboard();
    }

    // --- CSV Import/Export Logic ---
    window.importFromCsv = function(section) { document.getElementById(`import-${section}`).click(); }
    function handleFileUpload(event, section) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const data = parseCSV(text, section);
            if (data.length > 0) {
                if (!state[section]) state[section] = [];
                state[section] = [...state[section], ...data];
                saveState(); applyFilters(section);
                if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
                alert(`${data.length} enregistrements importes.`);
            } else { alert("Impossible d'importer le fichier."); }
        };
        reader.readAsText(file); event.target.value = '';
    }
    function parseCSV(text, section) {
        const lines = text.split(/\r\n|\n/).filter(line => line); if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const form = document.getElementById(`form-${section}`);
        const expectedKeys = Array.from(form.elements).map(el => el.name).filter(Boolean);
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const newEntry = { id: Date.now() + i, createdAt: new Date().toISOString() };
            for (let j = 0; j < expectedKeys.length; j++) if (values[j] !== undefined) newEntry[expectedKeys[j]] = values[j];
            data.push(newEntry);
        }
        return data;
    }
    window.exportToCsv = function(filename, section, customData = null) {
        const data = customData || state[section];
        if (!data || data.length === 0) { if (!customData) alert("Aucune donnee a exporter."); return; }
        const allKeys = new Set();
        data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
        const orderedKeys = Array.from(allKeys).filter(k => k !== 'id' && k !== 'createdAt');
        const headerRow = orderedKeys.join(',');
        const rows = data.map(item => orderedKeys.map(key => {
            let cell = item[key] == null ? '' : String(item[key]);
            if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) cell = `"${cell.replace(/"/g, '""')}"`;
            return cell;
        }).join(','));
        const csvContent = [headerRow, ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
        link.setAttribute("download", filename);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }

    // --- Initial Full Load ---
    function init() {
        renderDashboard();
        checkDeadlineAlert();
        renderNotifications();
        sections.forEach(section => applyFilters(section));
    }

    init();
});