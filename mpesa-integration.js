 
// ==========================================
// NETBILL - M-PESA STK PUSH INTEGRATION
// COMPLETE REPLACEMENT
// ALTERNATIVE CUSTOMER PHONE NUMBER
// DETAILED ERROR HANDLING
// ==========================================

(function () {
    "use strict";

    let requestInProgress = false;

    // ==========================================
    // FIND LOCAL CUSTOMER
    // ==========================================

    function getLocalCustomer(customerId) {
        const customers = JSON.parse(
            localStorage.getItem("netbillCustomers") || "[]"
        );

        return customers.find(
            customer => String(customer.id) === String(customerId)
        );
    }

    // ==========================================
    // GET CUSTOMER PHONE
    // ==========================================

    function getCustomerPhone(customer) {
        return (
            customer?.phone ||
            customer?.customer_data?.phone ||
            ""
        );
    }

    // ==========================================
    // PREPARE ALTERNATIVE PHONE NUMBER FIELD
    // ==========================================

    function preparePhoneInput(button) {
        let wrapper = document.getElementById("netbillPhoneWrapper");

        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "netbillPhoneWrapper";
            wrapper.style.marginTop = "15px";
            wrapper.style.marginBottom = "15px";

            wrapper.innerHTML = `
                <label for="netbillPaymentPhone"
                    style="display:block;font-weight:600;margin-bottom:7px;">
                    Customer Phone Number (M-Pesa)
                </label>

                <input
                    type="tel"
                    id="netbillPaymentPhone"
                    placeholder="e.g. 0712345678"
                    autocomplete="tel"
                    style="width:100%;box-sizing:border-box;padding:12px;
                    border:1px solid #ccc;border-radius:8px;
                    font-size:16px;"
                >

                <small style="display:block;margin-top:6px;color:#666;">
                    Enter the phone number that should receive the M-Pesa prompt.
                </small>
            `;

            button.parentNode.insertBefore(wrapper, button);
        }

        const phoneInput = document.getElementById(
            "netbillPaymentPhone"
        );

        const customerSelect =
            document.getElementById("paymentCustomer");

        function loadCustomerPhone() {
            if (!customerSelect || !phoneInput) return;

            const customer = getLocalCustomer(customerSelect.value);

            phoneInput.value = getCustomerPhone(customer);
        }

        if (
            customerSelect &&
            !customerSelect.dataset.phoneListenerAdded
        ) {
            customerSelect.addEventListener("change", loadCustomerPhone);
            customerSelect.dataset.phoneListenerAdded = "true";
        }

        if (!phoneInput.value && customerSelect?.value) {
            loadCustomerPhone();
        }

        return phoneInput;
    }

    // ==========================================
    // NORMALIZE KENYAN PHONE NUMBER
    // ==========================================

    function normalizePhone(value) {
        let phone = String(value || "").replace(/\D/g, "");

        if (phone.startsWith("0")) {
            phone = "254" + phone.substring(1);
        } else if (
            phone.startsWith("7") ||
            phone.startsWith("1")
        ) {
            phone = "254" + phone;
        }

        if (!/^254[17]\d{8}$/.test(phone)) {
            throw new Error(
                "Enter a valid Kenyan phone number, for example 0712345678."
            );
        }

        return phone;
    }

    // ==========================================
    // DISPLAY STATUS MESSAGE
    // ==========================================

    function getMessageElement(button) {
        let message = document.getElementById("netbillStkMessage");

        if (!message) {
            message = document.createElement("p");
            message.id = "netbillStkMessage";
            button.insertAdjacentElement("afterend", message);
        }

        message.style.display = "block";
        message.style.marginTop = "10px";
        message.style.fontWeight = "600";
        message.style.whiteSpace = "pre-wrap";

        return message;
    }

    function showMessage(button, text, color) {
        const message = getMessageElement(button);
        message.textContent = text;
        message.style.color = color;
    }

    // ==========================================
    // READ REAL SUPABASE FUNCTION ERROR
    // ==========================================

    async function getDetailedError(error) {
        let message = error?.message || "M-Pesa request failed.";

        // Supabase FunctionsHttpError may contain
        // the actual Edge Function response in context.

        if (error?.context) {
            try {
                const response = error.context;

                if (typeof response.clone === "function") {
                    const responseCopy = response.clone();

                    let responseData;

                    try {
                        responseData = await responseCopy.json();
                    } catch {
                        responseData = await response.clone().text();
                    }

                    if (typeof responseData === "string") {
                        message = responseData || message;
                    } else if (responseData) {
                        message =
                            responseData.error ||
                            responseData.message ||
                            responseData.msg ||
                            message;
                    }
                }
            } catch (readError) {
                console.warn(
                    "Could not read detailed Edge Function response:",
                    readError
                );
            }
        }

        // Handle ordinary JavaScript errors too.
        if (error?.name === "FunctionsRelayError") {
            message =
                "Supabase could not reach the Edge Function. Check that it is deployed and available.";
        }

        return String(message);
    }

    // ==========================================
    // SEND M-PESA REQUEST
    // ==========================================

    async function sendMpesaRequest(button) {
        if (requestInProgress) return;

        requestInProgress = true;

        const originalText = "Pay with M-Pesa (STK Push)";

        button.disabled = true;
        button.textContent = "Connecting to M-Pesa...";
        button.style.opacity = "0.7";

        try {
            const db = window.netbillSupabase;

            if (!db) {
                throw new Error(
                    "Supabase is not connected. Please refresh the page."
                );
            }

            const customerSelect =
                document.getElementById("paymentCustomer");

            const amountInput =
                document.getElementById("paymentAmount");

            const phoneInput = preparePhoneInput(button);

            if (!customerSelect || !amountInput) {
                throw new Error(
                    "Payment form fields could not be found."
                );
            }

            const customerId = customerSelect.value;
            const amount = Number(amountInput.value);

            const companyId = localStorage.getItem(
                "netbillCompanyId"
            );

            if (!customerId) {
                throw new Error("Please select a customer.");
            }

            if (!Number.isFinite(amount) || amount < 1) {
                throw new Error("Please enter a valid amount.");
            }

            if (!companyId) {
                throw new Error(
                    "Company account not found. Please log in again."
                );
            }

            const phone = normalizePhone(phoneInput.value);

            // ==================================
            // CHECK LOGIN SESSION
            // ==================================

            const {
                data: sessionData,
                error: sessionError
            } = await db.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!sessionData.session) {
                throw new Error(
                    "Your login session has expired. Please log in again."
                );
            }

            // ==================================
            // CHECK LOCAL CUSTOMER
            // ==================================

            const localCustomer = getLocalCustomer(customerId);

            if (!localCustomer) {
                throw new Error(
                    "Selected customer was not found in NetBill."
                );
            }

            showMessage(
                button,
                "Checking customer account...",
                "#142b4a"
            );

            // ==================================
            // FIND CUSTOMER IN SUPABASE
            // ==================================

            const {
                data: onlineCustomers,
                error: customerError
            } = await db
                .from("netbill_customers")
                .select("id, customer_data")
                .eq("company_id", companyId);

            if (customerError) {
                throw new Error(
                    "Could not check the cloud customer account: " +
                    customerError.message
                );
            }

            const onlineCustomer = (onlineCustomers || []).find(
                row =>
                    String(row.customer_data?.id) ===
                    String(localCustomer.id)
            );

            if (!onlineCustomer) {
                throw new Error(
                    "Customer has not synced to the cloud. Please sync the customer first."
                );
            }

            // ==================================
            // SEND REQUEST TO EDGE FUNCTION
            // ==================================

            showMessage(
                button,
                "Sending M-Pesa payment request...",
                "#142b4a"
            );

            const {
                data,
                error
            } = await db.functions.invoke("mpesa-stk-push", {
                body: {
                    customerId: onlineCustomer.id,
                    companyId: companyId,
                    amount: amount,
                    phone: phone
                }
            });

            if (error) {
                const detailedMessage =
                    await getDetailedError(error);

                throw new Error(detailedMessage);
            }

            if (!data || !data.success) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    "M-Pesa request was not successful."
                );
            }

            // ==================================
            // SUCCESS
            // ==================================

            showMessage(
                button,
                "STK Push sent to " + phone +
                "! Ask the customer to check their phone and enter their M-Pesa PIN.",
                "green"
            );

            button.textContent = "STK Push Sent";

        } catch (error) {
            console.error(
                "NETBILL M-PESA ERROR:",
                error
            );

            const detailedMessage =
                await getDetailedError(error);

            showMessage(
                button,
                "M-Pesa Error: " + detailedMessage,
                "red"
            );

            button.textContent = originalText;

        } finally {
            button.disabled = false;
            button.style.opacity = "1";
            requestInProgress = false;
        }
    }

    // ==========================================
    // HANDLE M-PESA BUTTON CLICK
    // ==========================================

    document.addEventListener("click", function (event) {
        const target = event.target;

        if (!target || typeof target.closest !== "function") {
            return;
        }

        const button = target.closest("#netbillStkButton");

        if (!button) return;

        event.preventDefault();

        sendMpesaRequest(button);
    });

    // ==========================================
    // PREPARE BUTTON AND PHONE FIELD
    // ==========================================

    function prepareButton() {
        const button = document.getElementById(
            "netbillStkButton"
        );

        if (!button) return;

        button.type = "button";
        button.disabled = false;
        button.style.display = "block";
        button.style.visibility = "visible";
        button.style.pointerEvents = "auto";
        button.style.cursor = "pointer";
        button.style.backgroundColor = "#168447";
        button.style.color = "white";

        preparePhoneInput(button);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            prepareButton
        );
    } else {
        prepareButton();
    }

})();
