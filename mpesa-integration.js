 
// ==========================================
// NETBILL - M-PESA STK PUSH INTEGRATION
// ==========================================

(function () {
    function initializeMpesa() {
        const paymentForm = document.getElementById("paymentForm");
        const button = document.getElementById("netbillStkButton");
        const message = document.getElementById("netbillStkMessage");

        if (!paymentForm || !button) return;

        // Make sure the existing HTML button is visible
        button.style.display = "block";
        button.style.visibility = "visible";
        button.style.opacity = "1";
        button.style.width = "100%";
        button.style.backgroundColor = "#168447";
        button.style.color = "#ffffff";
        button.style.padding = "12px";
        button.style.marginTop = "10px";
        button.style.border = "0";
        button.style.borderRadius = "6px";
        button.style.cursor = "pointer";

        // Prevent attaching the click handler more than once
        if (button.dataset.initialized === "true") return;
        button.dataset.initialized = "true";

        function showMessage(text, color) {
            if (!message) return;

            message.textContent = text;
            message.style.display = "block";
            message.style.color = color;
            message.style.marginTop = "10px";
        }

        button.addEventListener("click", async function () {
            const originalText = "Pay with M-Pesa (STK Push)";

            button.disabled = true;
            button.textContent = "Connecting to M-Pesa...";

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
                    throw new Error("Payment form fields were not found.");
                }

                const customerLocalId = customerSelect.value;
                const amount = Number(amountInput.value);
                const companyId =
                    localStorage.getItem("netbillCompanyId");

                if (!customerLocalId) {
                    throw new Error("Please select a customer.");
                }

                if (!Number.isFinite(amount) || amount < 1) {
                    throw new Error("Please enter a valid payment amount.");
                }

                if (!companyId) {
                    throw new Error(
                        "Company account not found. Please log in again."
                    );
                }

                const {
                    data: sessionData,
                    error: sessionError
                } = await db.auth.getSession();

                if (sessionError) throw sessionError;

                if (!sessionData.session) {
                    throw new Error("Your session has expired. Please log in again.");
                }

                const customers = JSON.parse(
                    localStorage.getItem("netbillCustomers") || "[]"
                );

                const localCustomer = customers.find(
                    customer =>
                        String(customer.id) === String(customerLocalId)
                );

                if (!localCustomer) {
                    throw new Error("Selected customer was not found.");
                }

                showMessage("Checking customer account...", "#142b4a");

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
                        "This customer has not synced to the cloud yet."
                    );
                }

                showMessage("Sending M-Pesa payment request...", "#142b4a");

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
                        "M-Pesa request failed."
                    );
                }

                showMessage(
                    "STK Push sent successfully! Ask the customer to check their phone and enter their M-Pesa PIN.",
                    "green"
                );

                button.textContent = "STK Push Sent";

            } catch (error) {
                showMessage(
                    error.message || "Could not send M-Pesa request.",
                    "red"
                );

                button.textContent = originalText;

            } finally {
                button.disabled = false;
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeMpesa);
    } else {
        initializeMpesa();
    }
})();
