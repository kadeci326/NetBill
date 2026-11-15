
 // ==========================================
 // NETBILL - AUTOMATIC NEW CUSTOMER WELCOME SMS
 // ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillWelcomeSMSHistory";

    function normalizePhone(phone) {
        let number = String(phone || "").replace(/\D/g, "");

        if (number.startsWith("0")) {
            number = "254" + number.substring(1);
        } else if (number.startsWith("7") || number.startsWith("1")) {
            number = "254" + number;
        }

        return /^254[17]\d{8}$/.test(number) ? number : null;
    }

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function saveHistory(history) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    async function sendWelcomeSMS(customer) {
        const phone = normalizePhone(customer.phone);

        if (!phone) {
            console.error("Welcome SMS: Invalid customer phone number.");
            return;
        }

        const history = getHistory();
        const alreadySent = history.some(
            item => String(item.customerId) === String(customer.id)
        );

        if (alreadySent) return;

        const supabaseClient = window.netbillSupabase;

        if (!supabaseClient || !supabaseClient.functions) {
            console.error("Welcome SMS: Supabase connection unavailable.");
            return;
        }

        const message =
            `Hello ${customer.name}, welcome to NetBill Internet Services! ` +
            `Your customer account has been registered successfully. ` +
            `Your package is ${customer.package}. ` +
            `Thank you for choosing us!`;

        const record = {
            customerId: customer.id,
            customer: customer.name,
            phone: phone,
            status: "Sending",
            date: new Date().toLocaleString(),
            message: message
        };

        history.unshift(record);
        saveHistory(history);

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

            record.status = "Accepted";
            record.messageId = data.result?.messageId || "";

            saveHistory(history);

            console.log("Welcome SMS accepted for:", customer.name);

        } catch (error) {
            record.status = "Failed";
            record.error = error.message || "SMS sending failed.";

            saveHistory(history);

            console.error("Welcome SMS failed:", error);
        }
    }

    function connectWelcomeSMS() {
        const form = document.getElementById("customerForm");

        if (!form || form.dataset.welcomeSMSConnected === "true") {
            return;
        }

        form.dataset.welcomeSMSConnected = "true";

        form.addEventListener("submit", function () {
            const previousCustomers = JSON.parse(
                localStorage.getItem("netbillCustomers") || "[]"
            );

            const previousIds = previousCustomers.map(
                customer => String(customer.id)
            );

            setTimeout(function () {
                const messageElement =
                    document.getElementById("customerMessage");

                if (
                    !messageElement ||
                    messageElement.textContent.trim() !==
                    "Customer added successfully!"
                ) {
                    return;
                }

                const updatedCustomers = JSON.parse(
                    localStorage.getItem("netbillCustomers") || "[]"
                );

                const newCustomer = updatedCustomers.find(
                    customer =>
                        !previousIds.includes(String(customer.id))
                );

                if (newCustomer) {
                    sendWelcomeSMS(newCustomer);
                }

            }, 100);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            connectWelcomeSMS
        );
    } else {
        connectWelcomeSMS();
    }

    console.log("NetBill customer welcome SMS system loaded.");

})();
