
// ==========================================
// NETBILL - DATA BACKUP AND RESTORE
// ==========================================

(function () {
    "use strict";

    const STORAGE_KEYS = [
        "netbillCustomers",
        "netbillPackages",
        "netbillPayments",
        "netbillInvoices",
        "netbillNotificationHistory",
        "netbillPaymentNotificationHistory"
    ];

    function createBackupPanel() {
        if (document.getElementById("netbillBackupPanel")) return;

        const panel = document.createElement("div");

        panel.id = "netbillBackupPanel";

        panel.style.cssText = `
            background: white;
            padding: 25px;
            margin: 25px 0;
            border-radius: 10px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            max-width: 700px;
        `;

        panel.innerHTML = `
            <h2 style="color:#123b68;">Data Backup & Restore</h2>

            <p>
                Protect your NetBill records by downloading a backup.
                You can restore your records whenever necessary.
            </p>

            <button id="netbillDownloadBackup"
                style="background:#198754;color:white;padding:12px 18px;
                border:0;border-radius:6px;cursor:pointer;margin:8px 5px 8px 0;">
                DOWNLOAD BACKUP
            </button>

            <hr style="margin:20px 0;">

            <h3>Restore Previous Backup</h3>

            <p>Select a NetBill backup JSON file from your computer.</p>

            <input type="file" id="netbillBackupFile" accept=".json">

            <br><br>

            <button id="netbillRestoreBackup"
                style="background:#123b68;color:white;padding:12px 18px;
                border:0;border-radius:6px;cursor:pointer;">
                RESTORE BACKUP
            </button>

            <p id="netbillBackupMessage"
                style="margin-top:15px;font-weight:bold;"></p>
        `;

        const settingsSection = document.getElementById("settings");

        if (settingsSection) {
            settingsSection.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }

        document.getElementById("netbillDownloadBackup")
            .addEventListener("click", downloadBackup);

        document.getElementById("netbillRestoreBackup")
            .addEventListener("click", restoreBackup);
    }

    function showMessage(message, success) {
        const element = document.getElementById("netbillBackupMessage");

        element.textContent = message;
        element.style.color = success ? "green" : "red";
    }

    // DOWNLOAD BACKUP
    function downloadBackup() {
        try {
            const data = {};

            STORAGE_KEYS.forEach(function (key) {
                data[key] = localStorage.getItem(key);
            });

            const backup = {
                app: "NetBill",
                version: 1,
                createdAt: new Date().toISOString(),
                data: data
            };

            const file = new Blob(
                [JSON.stringify(backup, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(file);

            const link = document.createElement("a");

            const date = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");

            link.href = url;
            link.download = "NetBill-Backup-" + date + ".json";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

            showMessage(
                "Backup downloaded successfully!",
                true
            );

        } catch (error) {
            console.error(error);

            showMessage(
                "Backup failed: " + error.message,
                false
            );
        }
    }

    // RESTORE BACKUP
    async function restoreBackup() {
        const fileInput =
            document.getElementById("netbillBackupFile");

        const file = fileInput.files[0];

        if (!file) {
            showMessage("Please select a backup file first.", false);
            return;
        }

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (
                backup.app !== "NetBill" ||
                !backup.data ||
                typeof backup.data !== "object"
            ) {
                throw new Error("This is not a valid NetBill backup.");
            }

            // Validate every supplied record before changing anything.
            STORAGE_KEYS.forEach(function (key) {
                const value = backup.data[key];

                if (value !== null && value !== undefined) {
                    if (typeof value !== "string") {
                        throw new Error("Invalid backup data for " + key);
                    }

                    const parsed = JSON.parse(value);

                    if (!Array.isArray(parsed)) {
                        throw new Error("Invalid records in " + key);
                    }
                }
            });

            const confirmed = confirm(
                "Restoring this backup will replace your current " +
                "NetBill customer, package, payment, invoice and " +
                "notification records. Download a backup of your " +
                "current records first if you need to keep them. Continue?"
            );

            if (!confirmed) return;

            STORAGE_KEYS.forEach(function (key) {
                const value = backup.data[key];

                if (value === null || value === undefined) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, value);
                }
            });

            showMessage(
                "Backup restored successfully! Refreshing NetBill...",
                true
            );

            setTimeout(function () {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error(error);

            showMessage(
                "Restore failed: " + error.message,
                false
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createBackupPanel);
    } else {
        createBackupPanel();
    }

})();
