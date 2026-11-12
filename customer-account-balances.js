
// ==========================================
// NETBILL - CUSTOMER ACCOUNT BALANCES
// ==========================================

function balanceFormatMoney(amount) {
    return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function calculateCustomerBalance(customer) {
    const customerInvoices = invoices.filter(invoice =>
        String(invoice.customerId) === String(customer.id)
    );

    const customerPayments = payments.filter(payment =>
        String(payment.customerId) === String(customer.id)
    );

    const totalInvoiced = customerInvoices.reduce(
        (total, invoice) => total + Number(invoice.amount || 0),
        0
    );

    const totalPaid = customerPayments.reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
    );

    return {
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced - totalPaid
    };
}

function addCustomerAccountBalances() {
    if (
        typeof customers === "undefined" ||
        typeof invoices === "undefined" ||
        typeof payments === "undefined"
    ) {
        return;
    }

    const customerTable = document.getElementById("customerList");

    if (!customerTable) return;

    const table = customerTable.closest("table");

    if (!table) return;

    const headerRow = table.querySelector("thead tr");

    if (
        headerRow &&
        !table.querySelector(".account-balance-heading")
    ) {
        const heading = document.createElement("th");
        heading.textContent = "Account Balance";
        heading.className = "account-balance-heading";
        headerRow.appendChild(heading);
    }

    const rows = customerTable.querySelectorAll("tr");

    rows.forEach((row, index) => {
        const customer = customers[index];

        if (!customer) return;

        if (row.querySelector(".customer-account-balance")) return;

        const balance = calculateCustomerBalance(customer);

        let status = "Fully Paid";
        let statusColor = "#16803c";

        if (balance.outstanding > 0.009) {
            status = "Owes Money";
            statusColor = "#c0392b";
        } else if (balance.outstanding < -0.009) {
            status = "Credit";
            statusColor = "#1769aa";
        }

        const cell = document.createElement("td");
        cell.className = "customer-account-balance";

        cell.innerHTML = `
            <strong>${balanceFormatMoney(balance.outstanding)}</strong>
            <br>
            <small>Invoiced: ${balanceFormatMoney(balance.totalInvoiced)}</small>
            <br>
            <small>Paid: ${balanceFormatMoney(balance.totalPaid)}</small>
            <br>
            <span style="color:${statusColor};font-weight:bold;">
                ${status}
            </span>
        `;

        row.appendChild(cell);
    });
}

// Refresh balances whenever the customer table is displayed
const previousDisplayCustomersForBalances = displayCustomers;

displayCustomers = function() {
    previousDisplayCustomersForBalances();
    addCustomerAccountBalances();
};

// Refresh balances whenever invoices are displayed
const previousDisplayInvoicesForBalances = displayInvoices;

displayInvoices = function() {
    previousDisplayInvoicesForBalances();
    addCustomerAccountBalances();
};

// Refresh balances whenever payments are displayed
const previousDisplayPaymentsForBalances = displayPayments;

displayPayments = function() {
    previousDisplayPaymentsForBalances();
    addCustomerAccountBalances();
};

// Initial display
addCustomerAccountBalances();

console.log("Customer account balances loaded successfully.");
