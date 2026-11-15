 
// ==========================================
// NETBILL - AUTOMATIC NEW CUSTOMER WELCOME SMS
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillWelcomeSMSHistory";

    let customersBeforeRegistration = [];

    // GET SAVED CUSTOMERS
    function getSavedCustomers() {
        try {
            const saved = JSON.parse(
                localStorage.getItem("netbillCustomers") || "[]"
            );

            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    // NORMALIZE KENYAN PHONE NUMBERS
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

    // GET SMS HISTORY
    function getSMSHistory() {
        try {
            const history = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            return Array.isArray(history) ? history : [];
        } catch (error) {
            return [];
        }
    }

    // SAVE SMS HISTORY
    function saveSMSHistory(history) {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );
    }

    // SEND WELCOME SMS
    async function sendWelcomeSMS(customer) {
        const messageElement =
            document.getElementById("customerMessage");

        try {
            if (!customer || !customer.id) {
                throw new Error("Customer details could not be found.");
            }

            const history = getSMSHistory();

            // PREVENT DUPLICATE ACCEPTED MESSAGES
            if (history.some(item =>
                String(item.customerId) === String(customer.id) &&
                item.status === "Accepted"
            )) {
                return;
            }

            const phone = normalizePhone(customer.phone);

            if (!phone) {
                throw new Error(
                    "Invalid or missing customer phone number."
                );
            }

            const supabaseClient = window.netbillSupabase;

            if (!supabaseClient || !supabaseClient.functions) {
                throw new Error(
                    "Supabase connection is not available."
                );
            }

            const smsMessage =
                `Hello ${customer.name}, welcome to NetBill Internet Services! ` +
                `Your customer account has been registered successfully. ` +
                `Your package is ${customer.package}. ` +
                `Thank you for choosing us!`;

            if (messageElement) {
                messageElement.style.color = "#b7791f";
                messageElement.textContent =
                    "Customer registered. Sending welcome SMS...";
            }

            // USE THE SAME REQUEST FORMAT AS PAYMENT SMS
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

            // USE THE SAME RESPONSE CHECK AS PAYMENT SMS
            if (!data || data.success !== true) {
                const errorMessage =
                    data?.result?.message ||
                    data?.error ||
                    "Mobile Sasa did not accept the welcome SMS.";

                throw new Error(errorMessage);
            }

            // SAVE SUCCESSFUL SMS
            const existingIndex = history.findIndex(item =>
                String(item.customerId) === String(customer.id)
            );

            const record = {
                customerId: customer.id,
                phone: phone,
                status: "Accepted",
                messageId: data.result?.messageId || "",
                date: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                history[existingIndex] = record;
            } else {
                history.push(record);
            }

            saveSMSHistory(history);

            if (messageElement) {
                messageElement.style.color = "green";
                messageElement.textContent =
                    "Customer added successfully! Welcome SMS accepted.";
            }

        } catch (error) {
            console.error("WELCOME SMS ERROR:", error);

            // SAVE FAILURE DETAILS
            const history = getSMSHistory();

            const existingIndex = history.findIndex(item =>
                String(item.customerId) === String(customer.id)
            );

            const failedRecord = {
                customerId: customer.id,
                phone: customer.phone || "",
                status: "Failed",
                error: error.message || "SMS sending failed.",
                date: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                history[existingIndex] = failedRecord;
            } else {
                history.push(failedRecord);
            }

            saveSMSHistory(history);

            if (messageElement) {
                messageElement.style.color = "darkorange";
                messageElement.textContent =
                    "Customer registered successfully, but welcome SMS failed: " +
                    (error.message || "SMS sending failed.");
            }
        }
    }

    // FIND CUSTOMER FORM
    const customerForm =
        document.getElementById("customerForm");

    if (!customerForm) {
        console.error("NetBill customer form was not found.");
        return;
    }

    // CAPTURE CUSTOMER LIST BEFORE REGISTRATION
    customerForm.addEventListener("submit", function () {
        customersBeforeRegistration = getSavedCustomers();
    }, true);

    // CHECK FOR NEW CUSTOMER AFTER MAIN REGISTRATION HANDLER
    customerForm.addEventListener("submit", function () {
        const previousIds = new Set(
            customersBeforeRegistration.map(customer =>
                String(customer.id)
            )
        );

        const updatedCustomers = getSavedCustomers();

        const newCustomer = updatedCustomers.find(customer =>
            !previousIds.has(String(customer.id))
        );

        if (newCustomer) {
            sendWelcomeSMS(newCustomer);
        }

    }, false);

    console.log("NetBill welcome SMS integration loaded.");

})();
