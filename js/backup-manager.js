class BackupManager {
    constructor(dbManager) {
        this.dbManager = dbManager;
        this.backupInterval = 1000 * 60 * 60; // 1 hour
        this.maxBackups = 5; // Keep last 5 backups
        this.backupKey = 'dashboardBackups';
        this.lastBackupKey = 'lastBackupTime';
    }

    async initializeBackup() {
        // Check if it's time for a backup
        const lastBackup = localStorage.getItem(this.lastBackupKey);
        const now = Date.now();

        if (!lastBackup || (now - parseInt(lastBackup)) > this.backupInterval) {
            await this.createBackup();
        }

        // Set up periodic backup
        setInterval(() => this.createBackup(), this.backupInterval);
    }

    async createBackup() {
        try {
            const sections = ['recrutement', 'mutation', 'doc_adm', 'depart', 'stc', 'archives', 'employeeList', 'settings'];
            const backupData = {};
            
            // Collect data from all sections
            for (const section of sections) {
                backupData[section] = await this.dbManager.getData(section);
            }

            // Create backup object
            const backup = {
                timestamp: Date.now(),
                data: backupData
            };

            // Get existing backups
            let backups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
            
            // Add new backup
            backups.push(backup);
            
            // Keep only the last N backups
            if (backups.length > this.maxBackups) {
                backups = backups.slice(-this.maxBackups);
            }

            // Save backups
            localStorage.setItem(this.backupKey, JSON.stringify(backups));
            localStorage.setItem(this.lastBackupKey, Date.now().toString());

            // Show success message
            this.showBackupNotification('Backup créé avec succès', 'success');
            
            console.log('Backup created successfully:', new Date().toLocaleString());
            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            this.showBackupNotification('Échec de la sauvegarde', 'error');
            return false;
        }
    }

    async restoreBackup(timestamp) {
        try {
            // Get backups
            const backups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
            const backup = backups.find(b => b.timestamp === timestamp);

            if (!backup) {
                throw new Error('Backup not found');
            }

            // Restore each section
            for (const [section, data] of Object.entries(backup.data)) {
                // The new saveData function handles clearing and saving the whole dataset.
                // It works for both arrays of data and the single settings object.
                if (data) { // Ensure data is not null or undefined
                    await this.dbManager.saveData(section, data);
                }
            }

            this.showBackupNotification('Restauration réussie', 'success');
            // We should reload the page to ensure the UI reflects the restored state
            location.reload();
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            this.showBackupNotification('Échec de la restauration', 'error');
            return false;
        }
    }

    getBackupsList() {
        const backups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
        return backups.map(backup => ({
            timestamp: backup.timestamp,
            date: new Date(backup.timestamp).toLocaleString()
        }));
    }

    async exportBackup(timestamp) {
        try {
            const backups = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
            const backup = backups.find(b => b.timestamp === timestamp);

            if (!backup) {
                throw new Error('Backup not found');
            }

            // Create blob and download
            const blob = new Blob([JSON.stringify(backup.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard_backup_${new Date(timestamp).toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showBackupNotification('Backup exporté avec succès', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showBackupNotification('Échec de l\'exportation', 'error');
        }
    }

    showBackupNotification(message, type) {
        const notification = document.getElementById('backup-notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `backup-notification ${type}`;
            setTimeout(() => {
                notification.textContent = '';
                notification.className = 'backup-notification';
            }, 3000);
        }
    }
}
