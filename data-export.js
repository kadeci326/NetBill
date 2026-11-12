 
// ==========================================
// NETBILL - DATA EXPORT SYSTEM
// ==========================================

// EXPORT RECORDS TO CSV
function exportToCSV(records, filename) {
    if (!Array.isArray(records) || records.length === 0) {
        alert("There is no data available to export.");
        return;
    }

    const columns = [...new Set(
        records.flatMap(record => Object.keys(record))
    )];

    function escapeCSV(value) {
        if (value === null || value === undefined) return "";

        if (typeof value === "object") {
            value = JSON.stringify(value);
        }

        return '"' + String(value).replace(/"/g, '""') + '"';
    }

    const rows = [
        columns.map(escapeCSV).join(","),
        ...records.map(record =>
            columns.map(column => escapeCSV(record[column])).join(",")
        )
    ];

    const csv = "\uFEFF" + rows.join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    alert("Your file has been downloaded successfully!");
}

// CREATE EXPORT BUTTONS
function createNetBillExportButtons() {
    const reports = document.getElementById("reports");

    if (!reports) return;

    let panel = document.getElementById("netbillExportPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "netbillExportPanel";
        panel.className = "card";

        panel.innerHTML = `
            <h3>Download Your NetBill Data</h3>
            <p>Download your records and open them in Microsoft Excel.</p>

            <button type="button" data-export="customers">
                Export Customers
            </button>

            <button type="button" data-export="payments">
                Export Payments
            </button>

            <button type="button" data-export="invoices">
                Export Invoices
            </button>
        `;
    }

    reports.appendChild(panel);
}

// CONNECT EXPORT BUTTONS
document.addEventListener("click", function(event) {
    const button = event.target.closest("[data-export]");

    if (!button) return;

    const type = button.dataset.export;

    if (type === "customers") {
        exportToCSV(customers, "NetBill-Customers.csv");
    }

    if (type === "payments") {
        exportToCSV(payments, "NetBill-Payments.csv");
    }

    if (type === "invoices") {
        exportToCSV(invoices, "NetBill-Invoices.csv");
    }
});

// FIX REPORTS REFRESH
// Keep the export buttons whenever Reports is opened.
const originalNetBillDisplayReports = displayReports;

displayReports = function() {
    originalNetBillDisplayReports();
    createNetBillExportButtons();
};

// DISPLAY BUTTONS
createNetBillExportButtons();

console.log("NetBill data export system loaded successfully.");
