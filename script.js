 
// ==========================================
// NETBILL - AUTOMATIC NEW CUSTOMER WELCOME SMS
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillWelcomeSMSHistory";

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

    function normalizePhone(phone) {
        let number = String(phone || "").replace(/\D/g, "");

        if (number.startsWith("0")) {
            number = "254" + number.substring(1);
        } else if (
            number.startsWith("7") ||
            number.startsWith("1")
        ) {
            number = "254" + number;
        }

        return /^254[17]\d{8}$/.test(number) ? number : null;
    }

    function getHistory() {
        try {
            const history = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            return Array.isArray(history) ? history : [];
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

    async function sendWelcomeSMS(customer) {
        const messageElement =
            document.getElementById("customerMessage");

        try {
            const history = getHistory();

            if (history.some(item =>
                String(item.customerId) === String(customer.id) &&
                item.status === "Accepted"
            )) {
                return;
            }

            const phone = normalizePhone(customer.phone);

            if (!phone) {
                throw new Error("Invalid customer phone number.");
            }

            const supabaseClient = window.netbillSupabase;

            if (!supabaseClient || !supabaseClient.functions) {
                throw new Error("Supabase connection is unavailable.");
            }

            const smsMessage =
                `Hello ${customer.name}, welcome to NetBill Internet Services! ` +
                `Your customer account has been registered successfully. ` +
                `Your package is ${customer.package}. ` +
                `Thank you for choosing us!`;

            if (messageElement) {
                messageElement.style.color = "#b7791f";
                messageElement.textContent =
                    "Customer added. Sending welcome SMS...";
            }

            const { data, error } =
                await supabaseClient.functions.invoke(
                    "send-flexcom-sms",
                    {
                        body: {
                            phone: phone,
                            message: smsMessage
                        }
                    }
                );

            if (error) {
                throw new Error(
                    error.message || "SMS request failed."
                );
            }

            if (!data || data.success !== true) {
                throw new Error(
                    data?.result?.message ||
                    data?.error ||
                    "Mobile Sasa did not accept the SMS."
                );
            }

            const record = {
                customerId: customer.id,
                phone: phone,
                status: "Accepted",
                messageId: data.result?.messageId || "",
                date: new Date().toISOString()
            };

            const updatedHistory = getHistory();

            const existingIndex = updatedHistory.findIndex(item =>
                String(item.customerId) === String(customer.id)
            );

            if (existingIndex >= 0) {
                updatedHistory[existingIndex] = record;
            } else {
                updatedHistory.push(record);
            }

            saveHistory(updatedHistory);

            if (messageElement) {
                messageElement.style.color = "green";
                messageElement.textContent =
                    "Customer added successfully! Welcome SMS accepted.";
            }

        } catch (error) {
            console.error("WELCOME SMS ERROR:", error);

            const history = getHistory();

            const record = {
                customerId: customer.id,
                phone: customer.phone || "",
                status: "Failed",
                error: error.message || "SMS sending failed.",
                date: new Date().toISOString()
            };

            const existingIndex = history.findIndex(item =>
                String(item.customerId) === String(customer.id)
            );

            if (existingIndex >= 0) {
                history[existingIndex] = record;
            } else {
                history.push(record);
            }

            saveHistory(history);

            if (messageElement) {
                messageElement.style.color = "darkorange";
                messageElement.textContent =
                    "Customer registered successfully, but welcome SMS failed: " +
                    record.error;
            }
        }
    }

    // CONNECT DIRECTLY TO THE CUSTOMER SAVE FUNCTION
    const originalSaveCustomers = window.saveCustomers;

    if (typeof originalSaveCustomers !== "function") {
        console.error(
            "NetBill welcome SMS: saveCustomers function was not found."
        );
        return;
    }

    // Remember customers already saved when the page opened.
    const knownCustomerIds = new Set(
        getCustomers().map(customer => String(customer.id))
    );

    // Replace the save function with a version that also checks
    // whether a new customer has just been registered.
    window.saveCustomers = function () {
        const result = originalSaveCustomers.apply(this, arguments);

        const updatedCustomers = getCustomers();

        updatedCustomers.forEach(customer => {
            const customerId = String(customer.id);

            if (!knownCustomerIds.has(customerId)) {
                knownCustomerIds.add(customerId);

                sendWelcomeSMS(customer);
            }
        });

        return result;
    };

    console.log(
        "NetBill welcome SMS is connected to customer registration."
    );

})();
