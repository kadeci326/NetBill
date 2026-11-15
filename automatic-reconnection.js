
// ==========================================
// NETBILL - AUTOMATIC CUSTOMER RECONNECTION
// ==========================================

(function () {
    "use strict";

    const CUSTOMER_KEY = "netbillCustomers";
    const PAYMENT_KEY = "netbillPayments";
    const SUSPENSION_KEY = "netbillSuspensionRecords";

    function readArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("NetBill could not read:", key, error);
            return [];
        }
    }

    function saveArray(key, data) {
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

    const paymentForm = document.getElementById("paymentForm");

    if (!paymentForm) return;

    // Listen before the normal payment handler runs.
    paymentForm.addEventListener("submit", function () {

        const customerId =
            document.getElementById("paymentCustomer").value;

        const previousPayments = readArray(PAYMENT_KEY);

        // Wait for the normal payment handler to save the payment.
        setTimeout(function () {

            const currentPayments = readArray(PAYMENT_KEY);

            const newPayment = currentPayments.find(payment =>
                String(payment.customerId) === String(customerId) &&
                !previousPayments.some(oldPayment =>
                    String(oldPayment.id) === String(payment.id)
                )
            );

            // Do nothing if payment was not successfully recorded.
            if (!newPayment) return;

            const customers = readArray(CUSTOMER_KEY);

            const customer = customers.find(item =>
                String(item.id) === String(customerId)
            );

            if (!customer) return;

            const today = todayString();

            if (customer.expiryDate && customer.expiryDate >= today) {

                // Restore active status.
                customer.status = "Active";

                saveArray(CUSTOMER_KEY, customers);

                // Refresh suspension records.
                if (typeof window.checkNetBillSuspensions === "function") {
                    window.checkNetBillSuspensions();
                }

                const message =
                    document.getElementById("paymentMessage");

                if (message) {
                    message.style.color = "green";
                    message.textContent =
                        "Payment recorded successfully! " +
                        customer.name +
                        "'s subscription is valid and their status is Active.";
                }

                console.log(
                    "NETBILL: Customer status restored to Active:",
                    customer.name
                );

            } else {

                // Payment does not automatically extend an expired subscription.
                customer.status = "Expired";

                saveArray(CUSTOMER_KEY, customers);

                if (typeof window.checkNetBillSuspensions === "function") {
                    window.checkNetBillSuspensions();
                }

                const message =
                    document.getElementById("paymentMessage");

                if (message) {
                    message.style.color = "#dc2626";
                    message.textContent =
                        "Payment recorded, but this subscription has expired. " +
                        "Please renew the subscription before restoring access.";
                }
            }

        }, 100);

    }, true);

    console.log("NetBill automatic reconnection is ready.");

})();
