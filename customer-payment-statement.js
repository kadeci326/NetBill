
// ==========================================
// NETBILL - CUSTOMER PAYMENT STATEMENT
// ==========================================

(function () {
    "use strict";

    const KEYS = {
        customers: "netbillCustomers",
        payments: "netbillPayments",
        invoices: "netbillInvoices",
        renewals: "netbillRenewalHistory"
    };

    function readData(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error("NetBill statement data error:", error);
            return [];
        }
    }

    function money(value) {
        return "Ksh " + Number(value || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function safe(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function getDate(item) {
        return item.date || item.dateCreated || item.paidDate ||
            item.renewalDate || item.dueDate || "-";
    }

    function createStatementSection() {
        const customersPage = document.getElementById("customers");

        if (!customersPage ||
            document.getElementById("customerStatementCard")) return;

        const card = document.createElement("div");
        card.id = "customerStatementCard";
        card.className = "card";

        card.innerHTML = `
            <h3>Customer Payment Statement</h3>
            <p>View a customer's payments, invoices, outstanding balance
               and subscription renewal history.</p>

            <label for="statementCustomer">Select Customer</label>
            <select id="statementCustomer">
                <option value="">Select a customer</option>
            </select>

            <div id="statementResults" style="display:none;">
                <div class="dashboard-cards">
                    <div class="card">
                        <h3>Total Invoiced</h3>
                        <p id="statementInvoiced">Ksh 0.00</p>
                    </div>
                    <div class="card">
                        <h3>Total Payments</h3>
                        <p id="statementPayments">Ksh 0.00</p>
                    </div>
                    <div class="card">
                        <h3>Outstanding Balance</h3>
                        <p id="statementOutstanding">Ksh 0.00</p>
                    </div>
                    <div class="card">
                        <h3>Successful Renewals</h3>
                        <p id="statementRenewals">0</p>
                    </div>
                </div>

                <button type="button" id="printCustomerStatement">
                    Print Customer Statement
                </button>

                <div class="table-container">
                    <h3>Complete Account History</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Transaction</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="statementTransactionList"></tbody>
                    </table>
                </div>
            </div>
        `;

        customersPage.appendChild(card);

        document.getElementById("statementCustomer")
            .addEventListener("change", displayStatement);

        document.getElementById("printCustomerStatement")
            .addEventListener("click", printStatement);

        refreshCustomerOptions();
    }

    function refreshCustomerOptions() {
        const select = document.getElementById("statementCustomer");
        if (!select) return;

        const previousValue = select.value;
        const customers = readData(KEYS.customers);

        select.innerHTML = '<option value="">Select a customer</option>';

        customers.forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });

        if (customers.some(item => String(item.id) === previousValue)) {
            select.value = previousValue;
            displayStatement();
        }
    }

    function displayStatement() {
        const customerId = document.getElementById("statementCustomer").value;
        const results = document.getElementById("statementResults");

        if (!customerId) {
            results.style.display = "none";
            return;
        }

        const customer = readData(KEYS.customers).find(
            item => String(item.id) === String(customerId)
        );

        if (!customer) {
            results.style.display = "none";
            return;
        }

        const payments = readData(KEYS.payments).filter(
            item => String(item.customerId) === String(customerId)
        );

        const invoices = readData(KEYS.invoices).filter(
            item => String(item.customerId) === String(customerId)
        );

        const renewals = readData(KEYS.renewals).filter(
            item => String(item.customerId) === String(customerId)
        );

        const totalInvoiced = invoices.reduce(
            (sum, item) => sum + Number(item.amount || 0), 0
        );

        const totalPayments = payments.reduce(
            (sum, item) => sum + Number(item.amount || 0), 0
        );

        const outstanding = invoices
            .filter(item => String(item.status).toLowerCase() !== "paid")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        document.getElementById("statementInvoiced").textContent =
            money(totalInvoiced);

        document.getElementById("statementPayments").textContent =
            money(totalPayments);

        document.getElementById("statementOutstanding").textContent =
            money(outstanding);

        document.getElementById("statementRenewals").textContent =
            renewals.length;

        const transactions = [];

        payments.forEach(item => {
            transactions.push({
                date: getDate(item),
                type: "Payment",
                description: item.method + " - " + (item.reference || "No reference"),
                amount: Number(item.amount || 0),
                status: "Received"
            });
        });

        invoices.forEach(item => {
            transactions.push({
                date: getDate(item),
                type: "Invoice",
                description: item.invoiceNumber || item.description || "Customer invoice",
                amount: Number(item.amount || 0),
                status: item.status || "Unpaid"
            });
        });

        renewals.forEach(item => {
            transactions.push({
                date: item.renewalDate || "-",
                type: "Subscription Renewal",
                description: (item.package || "Package") +
                    " (" + (item.previousExpiryDate || "-") +
                    " to " + (item.newExpiryDate || "-") + ")",
                amount: 0,
                status: "Successful"
            });
        });

        transactions.sort((a, b) =>
            String(b.date).localeCompare(String(a.date))
        );

        const table = document.getElementById("statementTransactionList");

        if (transactions.length === 0) {
            table.innerHTML = `
                <tr><td colspan="5">No account transactions found.</td></tr>
            `;
        } else {
            table.innerHTML = transactions.map(item => `
                <tr>
                    <td>${safe(item.date)}</td>
                    <td>${safe(item.type)}</td>
                    <td>${safe(item.description)}</td>
                    <td>${item.amount ? money(item.amount) : "-"}</td>
                    <td>${safe(item.status)}</td>
                </tr>
            `).join("");
        }

        results.style.display = "block";
    }

    function printStatement() {
        const customerId = document.getElementById("statementCustomer").value;
        const customer = readData(KEYS.customers).find(
            item => String(item.id) === String(customerId)
        );

        if (!customer) return;

        const results = document.getElementById("statementResults");
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert("Please allow pop-ups to print the statement.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>NetBill Customer Statement</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 25px; }
                    h1 { color: #123456; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ccc; padding: 9px; text-align: left; }
                    th { background: #eeeeee; }
                    .summary { margin: 20px 0; line-height: 2; }
                </style>
            </head>
            <body>
                <h1>NETBILL</h1>
                <h2>Customer Account Statement</h2>
                <p><strong>Customer:</strong> ${safe(customer.name)}</p>
                <p><strong>Phone:</strong> ${safe(customer.phone || "-")}</p>
                <div class="summary">
                    <p><strong>Total Invoiced:</strong>
                    ${safe(document.getElementById("statementInvoiced").textContent)}</p>
                    <p><strong>Total Payments:</strong>
                    ${safe(document.getElementById("statementPayments").textContent)}</p>
                    <p><strong>Outstanding Balance:</strong>
                    ${safe(document.getElementById("statementOutstanding").textContent)}</p>
                    <p><strong>Successful Renewals:</strong>
                    ${safe(document.getElementById("statementRenewals").textContent)}</p>
                </div>
                ${results.querySelector(".table-container").innerHTML}
                <script>window.onload = function () { window.print(); }<\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    document.addEventListener("DOMContentLoaded", createStatementSection);

    console.log("NetBill customer payment statements are ready.");

})();
