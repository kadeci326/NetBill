 
// ==========================================
// NETBILL - AUTOMATIC NEW CUSTOMER WELCOME SMS
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillWelcomeSMSHistory";

    let customersBeforeRegistration = [];

    // READ SAVED CUSTOMERS
    function getSavedCustomers() {
        try {
            return JSON.parse(
                localStorage.getItem("netbillCustomers") || "[]"
            );
        } catch (error) {
            return [];
        }
    }

    // NORMALIZE KENYAN PHONE NUMBERS
    function normalizePhone(phone) {
        let number = String(phone || "").replace(/\D/g, "");

        if (number.startsWith("0")) {
            number = "254" + number.substring(1);
        }

        if (number.startsWith("7") || number.startsWith("1")) {
            number = "254" + number;
        }

        return /^254[17]\d{8}$/.test(number) ? number : null;
    }

    // READ SMS HISTORY
    function getSMSHistory() {
        try {
            return JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );
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
                return;
            }

            const history = getSMSHistory();

            // PREVENT DUPLICATE WELCOME MESSAGES
            if (history.some(item =>
                String(item.customerId) === String(customer.id) &&
                item.status === "Sent"
            )) {
                return;
            }

            const phone = normalizePhone(customer.phone);

            if (!phone) {
                throw new Error(
                    "Invalid phone number. Use a valid Kenyan number."
                );
            }

            const supabaseClient = window.netbillSupabase;

            if (!supabaseClient ||
                !supabaseClient.functions) {
                throw new Error(
                    "NetBill SMS connection is not ready."
                );
            }

            const smsMessage =
                "Hello " + customer.name +
                ", welcome to NetBill Internet Services! " +
                "Your customer account has been registered successfully. " +
                "Your package is " + customer.package +
                ". Thank you for choosing us!";

            const response =
                await supabaseClient.functions.invoke(
                    "send-flexcom-sms",
                    {
                        body: {
                            phone: phone,
                            message: smsMessage
                        }
                    }
                );

            if (response.error) {
                throw response.error;
            }

            if (!response.data ||
                response.data.success !== true) {
                throw new Error(
                    response.data?.message ||
                    response.data?.error ||
                    "SMS provider did not confirm delivery."
                );
            }

            history.push({
                customerId: customer.id,
                phone: phone,
                status: "Sent",
                date: new Date().toISOString()
            });

            saveSMSHistory(history);

            if (messageElement) {
                messageElement.style.color = "green";
                messageElement.textContent =
                    "Customer added successfully! Welcome SMS sent.";
            }

        } catch (error) {
            console.error("WELCOME SMS ERROR:", error);

            if (messageElement) {
                messageElement.style.color = "darkorange";
                messageElement.textContent =
                    "Customer registered successfully, but welcome SMS failed: " +
                    (error.message || "Please check your SMS connection.");
            }
        }
    }

    // CAPTURE CUSTOMER LIST BEFORE REGISTRATION
    const customerForm =
        document.getElementById("customerForm");

    if (!customerForm) {
        console.error("NetBill customer form was not found.");
        return;
    }

    customerForm.addEventListener("submit", function () {
        customersBeforeRegistration = getSavedCustomers();
    }, true);

    // RUN AFTER THE MAIN CUSTOMER REGISTRATION CODE
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

    console.log("NetBill welcome SMS integration is ready.");

})();
