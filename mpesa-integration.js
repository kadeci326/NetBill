 
 // ==========================================
 // NETBILL - M-PESA STK PUSH INTEGRATION
 // COMPLETE REPLACEMENT
 // ==========================================

(function () {
    "use strict";

    let requestInProgress = false;

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

        return message;
    }

    function showMessage(button, text, color) {
        const message = getMessageElement(button);
        message.textContent = text;
        message.style.color = color;
    }

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

            if (!customerSelect || !amountInput) {
                throw new Error("Payment form fields could not be found.");
            }

            const customerId = customerSelect.value;
            const amount = Number(amountInput.value);
            const companyId = localStorage.getItem("netbillCompanyId");

            if (!customerId) {
                throw new Error("Please select a customer.");
            }

            if (!Number.isFinite(amount) || amount < 1) {
                throw new Error("Please enter a valid amount.");
            }

            if (!companyId) {
                throw new Error("Company account not found. Please log in again.");
            }

            const {
                data: sessionData,
                error: sessionError
            } = await db.auth.getSession();

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                throw new Error("Please log in again.");
            }

            const customers = JSON.parse(
                localStorage.getItem("netbillCustomers") || "[]"
            );

            const localCustomer = customers.find(
                customer =>
                    String(customer.id) === String(customerId)
            );

            if (!localCustomer) {
                throw new Error("Selected customer was not found.");
            }

            showMessage(
                button,
                "Checking customer account...",
                "#142b4a"
            );

            const {
                data: onlineCustomers,
                error: customerError
            } = await db
                .from("netbill_customers")
                .select("id, customer_data")
                .eq("company_id", companyId);

            if (customerError) throw customerError;

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
                    amount: amount
                }
            });

            if (error) throw error;

            if (!data || !data.success) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    "M-Pesa request was not successful."
                );
            }

            showMessage(
                button,
                "STK Push sent! Ask the customer to check their phone and enter their M-Pesa PIN.",
                "green"
            );

            button.textContent = "STK Push Sent";

        } catch (error) {
            console.error("NetBill M-Pesa error:", error);

            showMessage(
                button,
                error.message || "M-Pesa request failed.",
                "red"
            );

            button.textContent = originalText;

        } finally {
            button.disabled = false;
            button.style.opacity = "1";
            requestInProgress = false;
        }
    }

    // One click listener handles the existing HTML button
    document.addEventListener("click", function (event) {
        const button = event.target.closest("#netbillStkButton");

        if (!button) return;

        event.preventDefault();
        sendMpesaRequest(button);
    });

    // Make the existing button visible and clickable
    function prepareButton() {
        const button = document.getElementById("netbillStkButton");

        if (!button) return;

        button.type = "button";
        button.disabled = false;
        button.style.display = "block";
        button.style.visibility = "visible";
        button.style.pointerEvents = "auto";
        button.style.cursor = "pointer";
        button.style.backgroundColor = "#168447";
        button.style.color = "white";
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", prepareButton);
    } else {
        prepareButton();
    }

})();
