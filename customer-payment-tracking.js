
// ==========================================
// NETBILL - CUSTOMER PAYMENT TRACKING
// ==========================================

// Format amounts in Kenyan Shillings
function trackingFormatMoney(amount) {
    return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Add payment tracking information to customer table
function addCustomerPaymentTracking() {
    const customerTable = document.getElementById("customerList");

    if (!customerTable || typeof customers === "undefined" ||
        typeof payments === "undefined") {
        return;
    }

    const table = customerTable.closest("table");

    if (!table) return;

    const headerRow = table.querySelector("thead tr");

    // Add the new heading only once
    if (headerRow && !table.querySelector(".payment-tracking-heading")) {
        const heading = document.createElement("th");
        heading.textContent = "Payment Tracking";
        heading.className = "payment-tracking-heading";
        headerRow.appendChild(heading);
    }

    // Add payment information for each customer
    const rows = customerTable.querySelectorAll("tr");

    rows.forEach((row, index) => {
        const customer = customers[index];

        if (!customer) return;

        // Prevent duplicate tracking columns
        if (row.querySelector(".customer-payment-tracking")) return;

        const customerPayments = payments.filter(payment =>
            String(payment.customerId) === String(customer.id)
        );

        const totalPaid = customerPayments.reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
        );

        const cell = document.createElement("td");
        cell.className = "customer-payment-tracking";

        cell.innerHTML = `
            <strong>${trackingFormatMoney(totalPaid)}</strong>
            <br>
            <small>${customerPayments.length} payment(s)</small>
            <br>
            <button
                type="button"
                data-customer-payment-history="${customer.id}">
                View History
            </button>
        `;

        row.appendChild(cell);
    });
}

// Display a customer's payment history
function showCustomerPaymentHistory(customerId) {
    const customer = customers.find(item =>
        String(item.id) === String(customerId)
    );

    if (!customer) {
        alert("Customer not found.");
        return;
    }

    const customerPayments = payments.filter(payment =>
        String(payment.customerId) === String(customer.id)
    );

    if (customerPayments.length === 0) {
        alert(
            "PAYMENT HISTORY\n\n" +
            "Customer: " + customer.name +
            "\n\nNo payments recorded for this customer yet."
        );
        return;
    }

    let history =
        "PAYMENT HISTORY\n\n" +
        "Customer: " + customer.name +
        "\nPhone: " + customer.phone +
        "\n\n";

    let totalPaid = 0;

    customerPayments.forEach((payment, index) => {
        totalPaid += Number(payment.amount || 0);

        history +=
            (index + 1) + ". " +
            "Date: " + (payment.date || "-") +
            "\nAmount: " + trackingFormatMoney(payment.amount) +
            "\nMethod: " + (payment.method || "-") +
            "\nReference: " + (payment.reference || "-") +
            "\n\n";
    });

    history +=
        "TOTAL PAYMENTS: " + customerPayments.length +
        "\nTOTAL AMOUNT PAID: " + trackingFormatMoney(totalPaid);

    alert(history);
}

// Connect the View History buttons
function setupCustomerPaymentTracking() {
    const customerTable = document.getElementById("customerList");

    if (!customerTable) return;

    customerTable.addEventListener("click", function(event) {
        const button = event.target.closest(
            "[data-customer-payment-history]"
        );

        if (!button) return;

        showCustomerPaymentHistory(
            button.dataset.customerPaymentHistory
        );
    });
}

// Refresh payment tracking whenever customers are displayed
const originalDisplayCustomers = displayCustomers;

displayCustomers = function() {
    originalDisplayCustomers();

    addCustomerPaymentTracking();
};

// Refresh tracking whenever payments are displayed
const originalDisplayPayments = displayPayments;

displayPayments = function() {
    originalDisplayPayments();

    addCustomerPaymentTracking();
};

// Start customer payment tracking
setupCustomerPaymentTracking();
addCustomerPaymentTracking();

console.log("Customer payment tracking loaded successfully.");
