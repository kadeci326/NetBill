
// ==========================================
// NETBILL - AUTOMATIC SUBSCRIPTION RENEWAL
// ==========================================

(function () {
    "use strict";

    const CUSTOMER_KEY = "netbillCustomers";
    const PACKAGE_KEY = "netbillPackages";
    const INVOICE_KEY = "netbillInvoices";
    const RENEWAL_KEY = "netbillRenewalHistory";

    function readData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("NetBill data error:", key, error);
            return [];
        }
    }

    function saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function todayString() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function addDuration(startDate, duration) {
        const date = new Date(startDate + "T12:00:00");
        const value = String(duration).toLowerCase().trim();

        const match = value.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/);

        if (!match) return null;

        const amount = Number(match[1]);
        const unit = match[2];

        if (unit.startsWith("day")) {
            date.setDate(date.getDate() + amount);
        } else if (unit.startsWith("week")) {
            date.setDate(date.getDate() + amount * 7);
        } else if (unit.startsWith("month")) {
            date.setMonth(date.getMonth() + amount);
        } else if (unit.startsWith("year")) {
            date.setFullYear(date.getFullYear() + amount);
        }

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function renewPaidInvoice(invoice) {
        if (!invoice || invoice.status !== "Paid") return;

        const customers = readData(CUSTOMER_KEY);
        const packages = readData(PACKAGE_KEY);
        const invoices = readData(INVOICE_KEY);
        const history = readData(RENEWAL_KEY);

        // Prevent the same invoice from renewing twice.
        if (history.some(item =>
            String(item.invoiceId) === String(invoice.id)
        )) return;

        // Only process invoices explicitly created for renewal.
        if (!invoice.renewalForExpiryDate) return;

        const customer = customers.find(item =>
            String(item.id) === String(invoice.customerId)
        );

        if (!customer) return;

        const packageItem = packages.find(item =>
            String(item.name).toLowerCase() ===
            String(customer.package).toLowerCase()
        );

        if (!packageItem) {
            console.warn("NetBill: Customer package not found.");
            return;
        }

        const today = todayString();

        // Make sure the invoice is for the customer's current expiry date.
        if (customer.expiryDate !== invoice.renewalForExpiryDate) {
            console.warn("NetBill: Renewal invoice is outdated.");
            return;
        }

        if (Number(invoice.amount) < Number(packageItem.price)) {
            console.warn("NetBill: Renewal invoice is not fully paid.");
            return;
        }

        // Extend from the later of today or the existing expiry date.
        const startDate =
            customer.expiryDate && customer.expiryDate > today
                ? customer.expiryDate
                : today;

        const newExpiryDate = addDuration(
            startDate,
            packageItem.duration
        );

        if (!newExpiryDate) {
            console.warn("NetBill: Unsupported package duration.");
            return;
        }

        customer.startDate = today;
        customer.expiryDate = newExpiryDate;
        customer.status = "Active";

        saveData(CUSTOMER_KEY, customers);

        history.push({
            invoiceId: invoice.id,
            customerId: customer.id,
            customerName: customer.name,
            package: packageItem.name,
            previousExpiryDate: invoice.renewalForExpiryDate,
            newExpiryDate: newExpiryDate,
            renewalDate: today
        });

        saveData(RENEWAL_KEY, history);

        // Refresh NetBill customer and dashboard displays.
        if (typeof window.displayCustomers === "function") {
            window.displayCustomers();
        }

        if (typeof window.updateDashboard === "function") {
            window.updateDashboard();
        }

        if (typeof window.updateCustomerDropdowns === "function") {
            window.updateCustomerDropdowns();
        }

        if (typeof window.checkNetBillSuspensions === "function") {
            window.checkNetBillSuspensions();
        }

        console.log(
            "NETBILL: Subscription renewed successfully:",
            customer.name,
            newExpiryDate
        );

        alert(
            "SUBSCRIPTION RENEWED SUCCESSFULLY!\n\n" +
            "Customer: " + customer.name +
            "\nPackage: " + packageItem.name +
            "\nNew expiry date: " + newExpiryDate +
            "\nStatus: Active"
        );
    }

    // Listen for invoices being marked as paid.
    document.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-paid]");

        if (!button) return;

        const invoiceId = button.dataset.paid;

        setTimeout(function () {
            const invoices = readData(INVOICE_KEY);

            const invoice = invoices.find(item =>
                String(item.id) === String(invoiceId)
            );

            if (invoice && invoice.status === "Paid") {
                renewPaidInvoice(invoice);
            }
        }, 150);

    }, true);

    console.log("NetBill automatic subscription renewal is ready.");

})();
