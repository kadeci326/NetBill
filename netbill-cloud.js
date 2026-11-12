 
// ==========================================
// NETBILL - INVOICE CLOUD SYNCHRONISATION
// ==========================================

(function () {
    document.addEventListener("DOMContentLoaded", async function () {

        const status = document.createElement("div");

        status.id = "netbillCloudStatus";
        status.style.cssText = `
            position:fixed;
            bottom:15px;
            left:15px;
            right:15px;
            padding:14px;
            background:#172554;
            color:white;
            border-radius:8px;
            font-size:14px;
            z-index:99999;
            text-align:center;
        `;

        status.textContent = "Connecting invoices to Supabase...";
        document.body.appendChild(status);

        function showStatus(message, success = false) {
            status.style.background = success ? "#166534" : "#991b1b";
            status.textContent = message;
        }

        try {
            const db = window.netbillSupabase;

            if (!db) {
                throw new Error("Supabase connection not found.");
            }

            const companyId = localStorage.getItem("netbillCompanyId");

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            const { data: sessionData, error: sessionError } =
                await db.auth.getSession();

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                throw new Error("Please log in again.");
            }

            // Load online customers
            const { data: onlineCustomers, error: customerError } = await db
                .from("netbill_customers")
                .select("id, customer_data")
                .eq("company_id", companyId);

            if (customerError) throw customerError;

            // Load existing online invoices
            const { data: onlineInvoices, error: invoiceError } = await db
                .from("netbill_invoices")
                .select("id, invoice_data")
                .eq("company_id", companyId);

            if (invoiceError) throw invoiceError;

            // Load invoices saved on this computer
            const localInvoices = JSON.parse(
                localStorage.getItem("netbillInvoices") || "[]"
            );

            let uploaded = 0;

            for (const invoice of localInvoices) {

                // Avoid duplicate invoices
                const alreadyOnline = onlineInvoices.some(function (row) {
                    return String(row.invoice_data?.id) ===
                        String(invoice.id);
                });

                if (alreadyOnline) continue;

                // Find the matching online customer
                const matchingCustomer = onlineCustomers.find(function (row) {
                    return String(row.customer_data?.id) ===
                        String(invoice.customerId);
                });

                if (!matchingCustomer) {
                    throw new Error(
                        "Customer not found online for invoice " + invoice.id
                    );
                }

                const { error: insertError } = await db
                    .from("netbill_invoices")
                    .insert([{
                        company_id: companyId,
                        customer_id: matchingCustomer.id,
                        invoice_data: invoice
                    }]);

                if (insertError) throw insertError;

                uploaded++;
            }

            showStatus(
                "SUCCESS! Invoices checked online. " +
                onlineInvoices.length + " already online; " +
                uploaded + " newly uploaded.",
                true
            );

        } catch (error) {
            console.error("Invoice cloud error:", error);
            showStatus("CLOUD ERROR: " + error.message);
        }

    });
})();
