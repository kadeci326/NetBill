
// ==========================================
// NETBILL - HOTSPOT VOUCHER EXPORT
// EXCEL CSV + PDF PRINT EXPORT
// ==========================================

(function () {
    "use strict";

    const $ = id => document.getElementById(id);

    function createExportButtons() {
        const table = $("voucherList");

        if (!table || $("netbillVoucherExports")) return;

        const toolbar = document.createElement("div");
        toolbar.id = "netbillVoucherExports";

        toolbar.style.cssText = `
            display:flex;
            flex-wrap:wrap;
            gap:10px;
            margin:15px 0;
        `;

        toolbar.innerHTML = `
            <button type="button" id="exportVouchersExcel">
                Export Excel (CSV)
            </button>

            <button type="button" id="exportVouchersPDF">
                Export PDF
            </button>
        `;

        table.parentNode.insertBefore(toolbar, table);

        $("exportVouchersExcel").addEventListener(
            "click",
            exportVouchersExcel
        );

        $("exportVouchersPDF").addEventListener(
            "click",
            exportVouchersPDF
        );
    }

    function getVoucherTableData() {
        const table = $("voucherList")?.closest("table");

        if (!table) return null;

        const headers = Array.from(
            table.querySelectorAll("thead th")
        ).map(cell => cell.textContent.trim());

        const rows = Array.from(
            table.querySelectorAll("tbody tr")
        ).map(row =>
            Array.from(row.querySelectorAll("td")).map(cell => {
                const select = cell.querySelector("select");

                if (select) {
                    return select.value;
                }

                const checkbox = cell.querySelector('input[type="checkbox"]');

                if (checkbox) {
                    return "";
                }

                return cell.textContent.trim();
            })
        );

        // Remove the selection column and Actions column.
        const cleanHeaders = headers.slice(1, -1);

        const cleanRows = rows
            .filter(row => row.length > 1)
            .map(row => row.slice(1, -1));

        return {
            headers: cleanHeaders,
            rows: cleanRows
        };
    }

    function escapeCSV(value) {
        return '"' + String(value ?? "").replace(/"/g, '""') + '"';
    }

    function exportVouchersExcel() {
        const data = getVoucherTableData();

        if (!data || data.rows.length === 0) {
            alert("There are no vouchers to export.");
            return;
        }

        const csvRows = [
            data.headers,
            ...data.rows
        ];

        const csvContent = csvRows
            .map(row => row.map(escapeCSV).join(","))
            .join("\r\n");

        // Excel-friendly UTF-8 CSV.
        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            "NetBill-Hotspot-Vouchers-" +
            new Date().toISOString().slice(0, 10) +
            ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    function exportVouchersPDF() {
        const originalTable = $("voucherList")?.closest("table");

        if (!originalTable) {
            alert("Voucher table could not be found.");
            return;
        }

        const data = getVoucherTableData();

        if (!data || data.rows.length === 0) {
            alert("There are no vouchers to export.");
            return;
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=1000,height=750"
        );

        if (!printWindow) {
            alert("Please allow pop-ups to export the PDF.");
            return;
        }

        const companyName =
            localStorage.getItem("netbillCompanyName") ||
            "NETBILL INTERNET SERVICES";

        const headerHTML = data.headers
            .map(header => `<th>${escapeHTML(header)}</th>`)
            .join("");

        const rowsHTML = data.rows
            .map(row => `
                <tr>
                    ${row.map(value =>
                        `<td>${escapeHTML(value)}</td>`
                    ).join("")}
                </tr>
            `)
            .join("");

        printWindow.document.open();

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>NetBill Voucher Report</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #172033;
                    }

                    h1 {
                        color: #123456;
                        text-align: center;
                    }

                    p {
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 25px;
                    }

                    th, td {
                        border: 1px solid #ccc;
                        padding: 9px;
                        text-align: left;
                        font-size: 11px;
                    }

                    th {
                        background: #123456;
                        color: white;
                    }

                    tr:nth-child(even) {
                        background: #f1f5f9;
                    }

                    @media print {
                        body {
                            padding: 5px;
                        }

                        table {
                            page-break-inside: auto;
                        }

                        tr {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>

            <body>
                <h1>${escapeHTML(companyName)}</h1>

                <p>HOTSPOT VOUCHER REPORT</p>

                <p>
                    Generated:
                    ${new Date().toLocaleString("en-KE")}
                </p>

                <p>Total vouchers: ${data.rows.length}</p>

                <table>
                    <thead>
                        <tr>${headerHTML}</tr>
                    </thead>

                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>

                <script>
                    window.onload = function () {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function start() {
        createExportButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
