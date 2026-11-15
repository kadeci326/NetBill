 
// ==========================================
// NETBILL - AUTOMATIC PACKAGE EXPIRY SMS
// Sends one reminder SMS one day before expiry
// Uses the existing send-flexcom-sms function
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillExpirySMSHistory";

    function getCustomers() {
        try {
            const data = JSON.parse(
                localStorage.getItem("netbillCustomers") || "[]"
            );
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function getPhone(customer) {
        return String(
            customer.phone || customer.customerPhone || ""
        ).replace(/\D/g, "");
    }

    function normalizePhone(phone) {
        let number = phone;

        if (number.startsWith("0")) {
            number = "254" + number.substring(1);
        } else if (number.startsWith("7") || number.startsWith("1")) {
            number = "254" + number;
        }

        return /^254[17]\d{8}$/.test(number) ? number : null;
    }

    function getExpiry(customer) {
        return customer.expiryDate ||
            customer.customerExpiryDate ||
            customer.subscriptionExpiry ||
            "";
    }

    function getHistory() {
        try {
            return JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );
        } catch (error) {
            return [];
        }
    }

    function saveHistory(history) {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );
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

    function customerKey(customer) {
        return String(
            customer.id || getPhone(customer) || customer.name || ""
        );
    }

    async function sendExpiryReminder(customer) {
        const expiry = getExpiry(customer);
        const phone = normalizePhone(getPhone(customer));

        if (!expiry || !phone) return;

        const history = getHistory();
        const key = customerKey(customer) + "_" + expiry;

        // Prevent sending the same reminder more than once.
        if (history.some(item => item.key === key)) return;

        const supabaseClient = window.netbillSupabase;

        if (!supabaseClient || !supabaseClient.functions) {
            console.error("NetBill Supabase connection unavailable.");
            return;
        }

        const name = customer.name ||
            customer.customerName ||
            "Customer";

        const packageName = customer.package ||
            customer.packageName ||
            "internet package";

        const message =
            `Dear ${name}, your ${packageName} expires tomorrow (${expiry}). ` +
            `Please renew your subscription early to avoid interruption. ` +
            `Thank you. - NetBill`;

        try {
            const { data, error } =
                await supabaseClient.functions.invoke(
                    "send-flexcom-sms",
                    {
                        body: {
                            phone: phone,
                            message: message
                        }
                    }
                );

            if (error) {
                throw new Error(error.message || "SMS request failed.");
            }

            if (!data || data.success !== true) {
                throw new Error(
                    data?.result?.message ||
                    data?.error ||
                    "SMS provider did not accept the message."
                );
            }

            history.unshift({
                key: key,
                customer: name,
                phone: phone,
                expiry: expiry,
                status: "Accepted",
                date: new Date().toLocaleString(),
                message: message
            });

            saveHistory(history);

            console.log("Expiry reminder accepted for:", name);

            displaySubscriptionAlerts();

        } catch (error) {
            console.error("Expiry reminder failed:", error);

            // Failed messages are not recorded as sent.
            // They can be tried again the next time NetBill opens.
        }
    }

    function checkExpiringCustomers() {
        const customers = getCustomers();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        customers.forEach(customer => {
            const expiry = getExpiry(customer);
            if (!expiry) return;

            const expiryDate = new Date(expiry + "T00:00:00");

            if (isNaN(expiryDate.getTime())) return;

            const daysRemaining = Math.round(
                (expiryDate - today) / 86400000
            );

            // Send exactly one day before expiry.
            if (daysRemaining === 1) {
                sendExpiryReminder(customer);
            }
        });
    }

    function displaySubscriptionAlerts() {
        const dashboard = document.getElementById("dashboard");
        if (!dashboard) return;

        const customers = getCustomers();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alerts = customers.filter(customer => {
            const expiry = getExpiry(customer);
            if (!expiry) return false;

            const expiryDate = new Date(expiry + "T00:00:00");

            if (isNaN(expiryDate.getTime())) return false;

            const days = Math.round(
                (expiryDate - today) / 86400000
            );

            return days <= 3;
        });

        let box = document.getElementById("subscriptionAlerts");

        if (!box) {
            box = document.createElement("div");
            box.id = "subscriptionAlerts";
            dashboard.appendChild(box);
        }

        box.innerHTML = `
            <h2>Subscription Expiry Alerts</h2>
            ${
                alerts.length === 0
                ? "<p>All customer subscriptions are up to date.</p>"
                : alerts.map(customer => {
                    const expiry = getExpiry(customer);
                    const expiryDate = new Date(expiry + "T00:00:00");

                    const days = Math.round(
                        (expiryDate - today) / 86400000
                    );

                    const status = days < 0
                        ? "EXPIRED"
                        : days === 0
                            ? "EXPIRES TODAY"
                            : days === 1
                                ? "EXPIRES TOMORROW"
                                : "EXPIRES IN " + days + " DAYS";

                    const name = customer.name ||
                        customer.customerName ||
                        "Customer";

                    return `
                        <div style="
                            padding:12px;
                            margin:10px 0;
                            border-radius:6px;
                            background:${days < 0 ? "#ffe5e5" : "#fff3cd"};
                            color:#222;
                        ">
                            <strong>${escapeHTML(name)}</strong>
                            <br>
                            Phone: ${escapeHTML(getPhone(customer))}
                            <br>
                            Expiry: ${escapeHTML(expiry)}
                            <br>
                            <strong>${status}</strong>
                        </div>
                    `;
                }).join("")
            }
        `;
    }

    function startExpirySystem() {
        checkExpiringCustomers();
        displaySubscriptionAlerts();
    }

    document.addEventListener("DOMContentLoaded", startExpirySystem);

    document.addEventListener("click", function (event) {
        const button = event.target.closest(".nav-button");

        if (button && button.dataset.page === "dashboard") {
            startExpirySystem();
        }
    });

    window.addEventListener("storage", startExpirySystem);

    console.log("NetBill automatic expiry SMS system loaded.");

})();
