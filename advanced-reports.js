
// ==========================================
// NETBILL - ADVANCED BUSINESS REPORTS
// ==========================================

(function () {
    "use strict";

    function readData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    function money(value) {
        return "Ksh " + Number(value || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function escape(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function today() {
        const date = new Date();
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getReport() {
        const customers = readData("netbillCustomers");
        const payments = readData("netbillPayments");
        const invoices = readData("netbillInvoices");

        const currentDate = today();
        const todayDate = new Date(currentDate + "T00:00:00");

        const startOfWeek = new Date(todayDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));

        const startOfMonth = currentDate.substring(0, 7);

        const revenue = list => list.reduce(
            (total, payment) => total + Number(payment.amount || 0), 0
        );

        const todayPayments = payments.filter(
            payment => payment.date === currentDate
        );

        const weekPayments = payments.filter(payment => {
            return payment.date &&
                payment.date >= [
                    startOfWeek.getFullYear(),
                    String(startOfWeek.getMonth() + 1).padStart(2, "0"),
                    String(startOfWeek.getDate()).padStart(2, "0")
                ].join("-") &&
                payment.date <= currentDate;
        });

        const monthPayments = payments.filter(
            payment => String(payment.date || "").startsWith(startOfMonth)
        );

        const active = customers.filter(
            customer => !customer.expiryDate || customer.expiryDate >= currentDate
        );

        const expired = customers.filter(
            customer => customer.expiryDate && customer.expiryDate < currentDate
        );

        const unpaid = invoices.filter(
            invoice => invoice.status !== "Paid"
        );

        const unpaidTotal = unpaid.reduce(
            (total, invoice) => total + Number(invoice.amount || 0), 0
        );

        return {
            customers,
            payments,
            invoices,
            todayPayments,
            weekPayments,
            monthPayments,
            active,
            expired,
            unpaid,
            unpaidTotal,
            totalRevenue: revenue(payments),
            todayRevenue: revenue(todayPayments),
            weekRevenue: revenue(weekPayments),
            monthRevenue: revenue(monthPayments)
        };
    }

    function downloadCSV() {
        const report = getReport();

        const rows = [
            ["NETBILL BUSINESS REPORT"],
            ["Generated", today()],
            [],
            ["REVENUE SUMMARY"],
            ["Today", report.todayRevenue],
            ["This week", report.weekRevenue],
            ["This month", report.monthRevenue],
            ["All time", report.totalRevenue],
            [],
            ["CUSTOMER SUMMARY"],
            ["Total customers", report.customers.length],
            ["Active customers", report.active.length],
            ["Expired customers", report.expired.length],
            [],
            ["OUTSTANDING INVOICES"],
            ["Unpaid invoices", report.unpaid.length],
            ["Outstanding amount", report.unpaidTotal],
            [],
            ["PAYMENT HISTORY"],
            ["Customer", "Amount", "Method", "Reference", "Date"],
            ...report.payments.map(payment => [
                payment.customerName || "",
                payment.amount || 0,
                payment.method || "",
                payment.reference || "",
                payment.date || ""
            ])
        ];

        const csv = rows.map(row => row.map(value =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "NetBill-Business-Report-" + today() + ".csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    function displayAdvancedReports() {
        const reports = document.getElementById("reports");
        if (!reports) return;

        const report = getReport();

        let oldSection = document.getElementById("advancedReportSection");

        if (oldSection) oldSection.remove();

        const section = document.createElement("div");
        section.id = "advancedReportSection";

        section.innerHTML = `
            <div class="card">
                <h2>NetBill Business Performance</h2>
                <p>Revenue and business performance summary</p>

                <div class="report-cards">
                    <div class="card">
                        <h3>Today's Revenue</h3>
                        <p>${money(report.todayRevenue)}</p>
                    </div>

                    <div class="card">
                        <h3>This Week</h3>
                        <p>${money(report.weekRevenue)}</p>
                    </div>

                    <div class="card">
                        <h3>This Month</h3>
                        <p>${money(report.monthRevenue)}</p>
                    </div>

                    <div class="card">
                        <h3>Total Revenue</h3>
                        <p>${money(report.totalRevenue)}</p>
                    </div>

                    <div class="card">
                        <h3>Active Customers</h3>
                        <p>${report.active.length}</p>
                    </div>

                    <div class="card">
                        <h3>Expired Customers</h3>
                        <p>${report.expired.length}</p>
                    </div>

                    <div class="card">
                        <h3>Outstanding Invoices</h3>
                        <p>${report.unpaid.length}</p>
                    </div>

                    <div class="card">
                        <h3>Outstanding Amount</h3>
                        <p>${money(report.unpaidTotal)}</p>
                    </div>
                </div>

                <h3>Revenue Breakdown</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Payments</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Today</td>
                            <td>${report.todayPayments.length}</td>
                            <td>${money(report.todayRevenue)}</td>
                        </tr>
                        <tr>
                            <td>This Week</td>
                            <td>${report.weekPayments.length}</td>
                            <td>${money(report.weekRevenue)}</td>
                        </tr>
                        <tr>
                            <td>This Month</td>
                            <td>${report.monthPayments.length}</td>
                            <td>${money(report.monthRevenue)}</td>
                        </tr>
                        <tr>
                            <td>All Time</td>
                            <td>${report.payments.length}</td>
                            <td>${money(report.totalRevenue)}</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Outstanding Invoices</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            report.unpaid.length
                            ? report.unpaid.map(invoice => `
                                <tr>
                                    <td>${escape(invoice.invoiceNumber)}</td>
                                    <td>${escape(invoice.customerName)}</td>
                                    <td>${money(invoice.amount)}</td>
                                    <td>${escape(invoice.dueDate)}</td>
                                </tr>
                            `).join("")
                            : '<tr><td colspan="4">No outstanding invoices.</td></tr>'
                        }
                    </tbody>
                </table>

                <h3>Customer Status</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Number of Customers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Active</td><td>${report.active.length}</td></tr>
                        <tr><td>Expired</td><td>${report.expired.length}</td></tr>
                        <tr><td>Total</td><td>${report.customers.length}</td></tr>
                    </tbody>
                </table>

                <button type="button" id="downloadAdvancedReport">
                    Download Business Report (Excel/CSV)
                </button>

                <p><small>Report generated: ${today()}</small></p>
            </div>
        `;

        reports.appendChild(section);

        document.getElementById("downloadAdvancedReport")
            .addEventListener("click", downloadCSV);
    }

    window.displayAdvancedReports = displayAdvancedReports;

    document.addEventListener("DOMContentLoaded", displayAdvancedReports);

    const originalDisplayReports = window.displayReports;

    if (typeof originalDisplayReports === "function") {
        window.displayReports = function () {
            const result = originalDisplayReports.apply(this, arguments);
            displayAdvancedReports();
            return result;
        };
    }

})();
