 
 // ==========================================
 // NETBILL - M-PESA STK PUSH INTEGRATION
 // ==========================================

(function () {
    function initializeMpesa() {
        const db = window.netbillSupabase;
        const paymentForm = document.getElementById("paymentForm");

        if (!paymentForm) return;

        // Prevent duplicate buttons
        if (document.getElementById("netbillStkButton")) return;

        const customerSelect = document.getElementById("paymentCustomer");
        const amountInput = document.getElementById("paymentAmount");

        if (!customerSelect || !amountInput || !db) {
            showError("M-Pesa could not initialize. Please refresh the page.");
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.id = "netbillStkButton";
        button.textContent = "Pay with M-Pesa (STK Push)";
        button.style.cssText =
            "background:#168447;color:white;padding:12px;margin-top:12px;" +
            "width:100%;border:0;border-radius:6px;cursor:pointer;";

        const message = document.createElement("p");
        message.id = "netbillStkMessage";

        const recordButton = paymentForm.querySelector(
            'button[type="submit"]'
        );

        if (recordButton) {
            recordButton.insertAdjacentElement("afterend", button);
        } else {
            paymentForm.appendChild(button);
        }

        button.insertAdjacentElement("afterend", message);

        function showMessage(text, color) {
            message.textContent = text;
            message.style.color = color;
        }

        function showError(text) {
            let notice = document.getElementById("netbillMpesaNotice");

            if (!notice) {
                notice = document.createElement("p");
                notice.id = "netbillMpesaNotice";
                paymentForm.appendChild(notice);
            }

            notice.textContent = text;
            notice.style.color = "red";
        }

        button.addEventListener("click", async function () {
            button.disabled = true;
            button.textContent = "Connecting to M-Pesa...";

            try {
                const customerLocalId = customerSelect.value;
                const amount = Number(amountInput.value);
                const companyId = localStorage.getItem("netbillCompanyId");

                if (!customerLocalId) {
                    throw new Error("Please select a customer.");
                }

                if (!Number.isFinite(amount) || amount < 1) {
                    throw new Error("Enter a valid payment amount.");
                }

                if (!companyId) {
                    throw new Error("Company account not found. Please log in again.");
                }

                const { data: sessionData, error: sessionError } =
                    await db.auth.getSession();

                if (sessionError) throw sessionError;

                if (!sessionData.session) {
                    throw new Error("Please log in again.");
                }

                const customers = JSON.parse(
                    localStorage.getItem("netbillCustomers") || "[]"
                );

                const localCustomer = customers.find(
                    customer =>
                        String(customer.id) === String(customerLocalId)
                );

                if (!localCustomer) {
                    throw new Error("Customer not found.");
                }

                const { data: onlineCustomers, error: customerError } =
                    await db
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
                        "Customer has not synced to the cloud yet. Please try again shortly."
                    );
                }

                showMessage("Sending payment request...", "#123456");

                const { data, error } = await db.functions.invoke(
                    "mpesa-stk-push",
                    {
                        body: {
                            customerId: onlineCustomer.id,
                            companyId: companyId,
                            amount: amount
                        }
                    }
                );

                if (error) throw error;

                if (!data || !data.success) {
                    throw new Error(
                        data?.error || data?.message || "M-Pesa request failed."
                    );
                }

                showMessage(
                    "STK Push sent! Ask the customer to check their phone and enter their M-Pesa PIN.",
                    "green"
                );

                button.textContent = "STK Push Sent";

            } catch (error) {
                showMessage(
                    error.message || "Could not send M-Pesa request.",
                    "red"
                );

                button.textContent = "Pay with M-Pesa (STK Push)";

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
