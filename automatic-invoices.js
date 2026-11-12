
// ==========================================
// NETBILL AUTOMATIC INVOICE GENERATION
// ==========================================

function generateAutomaticInvoices() {
    let customers = JSON.parse(
        localStorage.getItem("netbillCustomers") || "[]"
    );

    let packages = JSON.parse(
        localStorage.getItem("netbillPackages") || "[]"
    );

    let invoices = JSON.parse(
        localStorage.getItem("netbillInvoices") || "[]"
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let generatedCount = 0;

    customers.forEach(customer => {
        if (!customer.expiryDate) return;

        const expiryDate = new Date(
            customer.expiryDate + "T00:00:00"
        );

        const daysRemaining = Math.round(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        // Generate invoices only within 3 days of expiry
        if (daysRemaining < 0 || daysRemaining > 3) {
            return;
        }

        const selectedPackage = packages.find(
            item => item.name === customer.package
        );

        if (!selectedPackage) return;

        // Prevent duplicate renewal invoices
        const alreadyGenerated = invoices.some(invoice =>
            String(invoice.customerId) === String(customer.id) &&
            invoice.renewalForExpiryDate === customer.expiryDate
        );

        if (alreadyGenerated) return;

        const invoice = {
            id: Date.now() + generatedCount,
            invoiceNumber: "INV-" + Date.now() + "-" + generatedCount,
            customerId: customer.id,
            customerName: customer.name,
            description: "Automatic subscription renewal - " +
                selectedPackage.name,
            amount: Number(selectedPackage.price),
            dueDate: customer.expiryDate,
            date: today.toISOString().split("T")[0],
            status: "Unpaid",
            renewalForExpiryDate: customer.expiryDate
        };

        invoices.push(invoice);
        generatedCount++;
    });

    localStorage.setItem(
        "netbillInvoices",
        JSON.stringify(invoices)
    );

    if (generatedCount > 0) {
        console.log(
            generatedCount + " automatic renewal invoice(s) generated."
        );

        if (typeof displayInvoices === "function") {
            displayInvoices();
        }

        if (typeof displayReports === "function") {
            displayReports();
        }
    }
}

// Run when the application loads
document.addEventListener("DOMContentLoaded", function () {
    generateAutomaticInvoices();

    // Check again after a new customer is registered
    const customerForm = document.getElementById("customerForm");

    if (customerForm) {
        customerForm.addEventListener("submit", function () {
            setTimeout(generateAutomaticInvoices, 100);
        });
    }
});
