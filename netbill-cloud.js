 
// ==========================================
// NETBILL - AUTOMATIC CLOUD SYNCHRONISATION
// ==========================================

(function () {

    let statusBox = null;
    let syncTimer = null;
    let syncRunning = false;
    let syncAgain = false;

    // --------------------------------------
    // STATUS MESSAGE
    // --------------------------------------

    function showStatus(message, success = true) {

        if (!statusBox) return;

        statusBox.style.background = success
            ? "#166534"
            : "#991b1b";

        statusBox.textContent = message;
    }

    // --------------------------------------
    // GET LOCAL DATA
    // --------------------------------------

    function getLocalData(key) {

        return JSON.parse(
            localStorage.getItem(key) || "[]"
        );
    }

    // --------------------------------------
    // CHECK AND SAVE ONLINE RECORDS
    // --------------------------------------

    async function syncCollection(
        db,
        table,
        column,
        records,
        companyId,
        extraData
    ) {

        const { data: onlineRecords, error } = await db
            .from(table)
            .select("*")
            .eq("company_id", companyId);

        if (error) throw error;

        let uploaded = 0;
        let updated = 0;

        for (const record of records) {

            const existing = onlineRecords.find(function (row) {

                return String(row[column]?.id) ===
                    String(record.id);

            });

            const relationData = extraData
                ? await extraData(record)
                : {};

            const payload = {
                company_id: companyId,
                [column]: record,
                ...relationData
            };

            if (existing) {

                const { error: updateError } = await db
                    .from(table)
                    .update(payload)
                    .eq("id", existing.id)
                    .eq("company_id", companyId);

                if (updateError) throw updateError;

                updated++;

            } else {

                const { error: insertError } = await db
                    .from(table)
                    .insert([payload]);

                if (insertError) throw insertError;

                uploaded++;
            }
        }

        return {
            uploaded,
            updated,
            checked: records.length
        };
    }

    // --------------------------------------
    // MAIN SYNCHRONISATION
    // --------------------------------------

    async function syncAll() {

        if (syncRunning) {
            syncAgain = true;
            return;
        }

        syncRunning = true;

        try {

            const db = window.netbillSupabase;

            if (!db) {
                throw new Error("Supabase connection not found.");
            }

            const companyId =
                localStorage.getItem("netbillCompanyId");

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            const { data: sessionData, error: sessionError } =
                await db.auth.getSession();

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                throw new Error("Please log in again.");
            }

            showStatus("Synchronising NetBill with Supabase...");

            // GET LOCAL RECORDS

            const packages = getLocalData("netbillPackages");
            const customers = getLocalData("netbillCustomers");
            const payments = getLocalData("netbillPayments");
            const invoices = getLocalData("netbillInvoices");

            // 1. SYNCHRONISE PACKAGES

            const packageResult = await syncCollection(
                db,
                "netbill_packages",
                "package_data",
                packages,
                companyId
            );

            // LOAD ONLINE PACKAGES

            const { data: onlinePackages, error: packageError } =
                await db
                    .from("netbill_packages")
                    .select("id, package_data")
                    .eq("company_id", companyId);

            if (packageError) throw packageError;

            // 2. SYNCHRONISE CUSTOMERS

            const customerResult = await syncCollection(
                db,
                "netbill_customers",
                "customer_data",
                customers,
                companyId,
                async function (customer) {

                    const matchingPackage = onlinePackages.find(
                        function (row) {
                            return row.package_data?.name ===
                                customer.package;
                        }
                    );

                    return {
                        package_id: matchingPackage
                            ? matchingPackage.id
                            : null
                    };
                }
            );

            // LOAD ONLINE CUSTOMERS

            const { data: onlineCustomers, error: customerError } =
                await db
                    .from("netbill_customers")
                    .select("id, customer_data")
                    .eq("company_id", companyId);

            if (customerError) throw customerError;

            // FIND CUSTOMER DATABASE ID

            async function findOnlineCustomer(customerId) {

                const customer = onlineCustomers.find(
                    function (row) {
                        return String(row.customer_data?.id) ===
                            String(customerId);
                    }
                );

                if (!customer) {
                    throw new Error(
                        "Matching online customer not found: " +
                        customerId
                    );
                }

                return customer.id;
            }

            // 3. SYNCHRONISE PAYMENTS

            const paymentResult = await syncCollection(
                db,
                "netbill_payments",
                "payment_data",
                payments,
                companyId,
                async function (payment) {

                    return {
                        customer_id: await findOnlineCustomer(
                            payment.customerId
                        )
                    };
                }
            );

            // 4. SYNCHRONISE INVOICES

            const invoiceResult = await syncCollection(
                db,
                "netbill_invoices",
                "invoice_data",
                invoices,
                companyId,
                async function (invoice) {

                    return {
                        customer_id: await findOnlineCustomer(
                            invoice.customerId
                        )
                    };
                }
            );

            showStatus(
                "CLOUD SYNC SUCCESSFUL! " +
                "Packages: " + packages.length +
                " | Customers: " + customers.length +
                " | Payments: " + payments.length +
                " | Invoices: " + invoices.length,
                true
            );

        } catch (error) {

            showStatus(
                "CLOUD SYNC ERROR: " + error.message,
                false
            );

        } finally {

            syncRunning = false;

            if (syncAgain) {
                syncAgain = false;
                scheduleSync();
            }
        }
    }

    // --------------------------------------
    // SCHEDULE AUTOMATIC SYNCHRONISATION
    // --------------------------------------

    function scheduleSync() {

        clearTimeout(syncTimer);

        syncTimer = setTimeout(function () {
            syncAll();
        }, 1000);
    }

    // --------------------------------------
    // CONNECT EXISTING SAVE FUNCTIONS
    // --------------------------------------

    function connectSaveFunction(functionName) {

        const originalFunction = window[functionName];

        if (typeof originalFunction !== "function") {
            throw new Error(
                "Could not find " + functionName +
                " in script.js"
            );
        }

        window[functionName] = function (...args) {

            const result = originalFunction.apply(this, args);

            scheduleSync();

            return result;
        };
    }

    // --------------------------------------
    // START NETBILL CLOUD
    // --------------------------------------

    function startCloudSync() {

        statusBox = document.createElement("div");

        statusBox.id = "netbillCloudStatus";

        statusBox.style.cssText = `
            position: fixed;
            bottom: 15px;
            left: 15px;
            right: 15px;
            padding: 14px;
            background: #172554;
            color: white;
            border-radius: 8px;
            font-size: 14px;
            z-index: 99999;
            text-align: center;
        `;

        statusBox.textContent =
            "Starting automatic NetBill cloud synchronisation...";

        document.body.appendChild(statusBox);

        try {

            connectSaveFunction("savePackages");
            connectSaveFunction("saveCustomers");
            connectSaveFunction("savePayments");
            connectSaveFunction("saveInvoices");

            // CHECK AND SYNCHRONISE EXISTING DATA

            syncAll();

        } catch (error) {

            showStatus(
                "CLOUD SETUP ERROR: " + error.message,
                false
            );

        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        startCloudSync
    );

})();
