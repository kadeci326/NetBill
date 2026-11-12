
// ==========================================
// NETBILL - HOTSPOT ACCOUNT MANAGEMENT
// ==========================================

(function () {
    "use strict";

    let hotspotAccounts = [];
    let customers = [];
    let packages = [];

    const supabase = window.netbillSupabase;

    function getCompanyId() {
        return localStorage.getItem("netbillCompanyId");
    }

    function readLocalData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Could not read " + key, error);
            return [];
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function showMessage(message, isError = false) {
        const element = document.getElementById("hotspotMessage");

        if (!element) return;

        element.textContent = message;
        element.style.color = isError ? "#dc2626" : "#16a34a";
    }

    function formatDate(value) {
        if (!value) return "-";

        return escapeHTML(value);
    }

    function getEffectiveStatus(account) {
        if (account.account_status === "Suspended") {
            return "Suspended";
        }

        if (
            account.expiry_date &&
            new Date(account.expiry_date + "T23:59:59") < new Date()
        ) {
            return "Expired";
        }

        return account.account_status;
    }

    function getStatusClass(status) {
        return String(status || "").toLowerCase();
    }

    // LOAD LOCAL CUSTOMERS AND PACKAGES
    function loadLocalOptions() {
        customers = readLocalData("netbillCustomers").filter(customer =>
            customer.connectionType === "Hotspot" &&
            !customer.deleted
        );

        packages = readLocalData("netbillPackages").filter(pkg =>
            pkg.connection === "Hotspot" &&
            !pkg.deleted
        );

        const customerSelect = document.getElementById("hotspotCustomer");
        const packageSelect = document.getElementById("hotspotPackage");

        if (!customerSelect || !packageSelect) return;

        const selectedCustomer = customerSelect.value;
        const selectedPackage = packageSelect.value;

        customerSelect.innerHTML =
            '<option value="">Select Hotspot Customer</option>';

        customers.forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            option.textContent = customer.name;
            customerSelect.appendChild(option);
        });

        packageSelect.innerHTML =
            '<option value="">Select Hotspot Package</option>';

        packages.forEach(pkg => {
            const option = document.createElement("option");
            option.value = pkg.id;
            option.textContent =
                pkg.name + " - Ksh " + Number(pkg.price || 0).toLocaleString("en-KE");
            packageSelect.appendChild(option);
        });

        if (customers.some(customer =>
            String(customer.id) === String(selectedCustomer)
        )) {
            customerSelect.value = selectedCustomer;
        }

        if (packages.some(pkg =>
            String(pkg.id) === String(selectedPackage)
        )) {
            packageSelect.value = selectedPackage;
        }
    }

    // FIND THE SUPABASE CUSTOMER RECORD
    async function findCloudCustomer(localCustomerId, companyId) {
        const { data, error } = await supabase
            .from("netbill_customers")
            .select("id, customer_data")
            .eq("company_id", companyId);

        if (error) throw error;

        return (data || []).find(row =>
            String(row.customer_data?.id) === String(localCustomerId)
        );
    }

    // FIND THE SUPABASE PACKAGE RECORD
    async function findCloudPackage(localPackageId, companyId) {
        const { data, error } = await supabase
            .from("netbill_packages")
            .select("id, package_data")
            .eq("company_id", companyId);

        if (error) throw error;

        return (data || []).find(row =>
            String(row.package_data?.id) === String(localPackageId)
        );
    }

    // LOAD HOTSPOT ACCOUNTS
    async function loadHotspotAccounts() {
        if (!supabase) {
            showMessage("Supabase connection is not available.", true);
            return;
        }

        const companyId = getCompanyId();

        if (!companyId) {
            showMessage("Company information is missing. Please log in again.", true);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("netbill_hotspot_accounts")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            hotspotAccounts = data || [];

            renderHotspotAccounts();
            updateHotspotStatistics();

        } catch (error) {
            console.error("Hotspot loading error:", error);
            showMessage("Could not load Hotspot accounts: " + error.message, true);
        }
    }

    // DISPLAY HOTSPOT ACCOUNTS
    async function renderHotspotAccounts() {
        const table = document.getElementById("hotspotList");

        if (!table) return;

        if (hotspotAccounts.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7">No Hotspot accounts registered yet.</td>
                </tr>
            `;
            return;
        }

        const companyId = getCompanyId();

        try {
            const [customerResult, packageResult] = await Promise.all([
                supabase
                    .from("netbill_customers")
                    .select("id, customer_data")
                    .eq("company_id", companyId),

                supabase
                    .from("netbill_packages")
                    .select("id, package_data")
                    .eq("company_id", companyId)
            ]);

            if (customerResult.error) throw customerResult.error;
            if (packageResult.error) throw packageResult.error;

            const customerRows = customerResult.data || [];
            const packageRows = packageResult.data || [];

            table.innerHTML = hotspotAccounts.map(account => {
                const customerRow = customerRows.find(row =>
                    row.id === account.customer_id
                );

                const packageRow = packageRows.find(row =>
                    row.id === account.package_id
                );

                const customerName =
                    customerRow?.customer_data?.name || "Customer record";

                const packageName =
                    packageRow?.package_data?.name || "Package record";

                const status = getEffectiveStatus(account);

                return `
                    <tr>
                        <td>${escapeHTML(customerName)}</td>
                        <td>${escapeHTML(account.hotspot_username)}</td>
                        <td>${escapeHTML(packageName)}</td>
                        <td>${formatDate(account.start_date)}</td>
                        <td>${formatDate(account.expiry_date)}</td>
                        <td>
                            <select class="hotspot-status"
                                data-id="${escapeHTML(account.id)}">
                                ${["Pending", "Active", "Suspended", "Expired"]
                                    .map(option => `
                                        <option value="${option}"
                                            ${status === option ? "selected" : ""}>
                                            ${option}
                                        </option>
                                    `).join("")}
                            </select>
                        </td>
                        <td>
                            <span class="status-${getStatusClass(status)}">
                                ${escapeHTML(status)}
                            </span>
                        </td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            console.error("Hotspot display error:", error);
            table.innerHTML = `
                <tr>
                    <td colspan="7">Unable to display account details.</td>
                </tr>
            `;
        }
    }

    // UPDATE STATISTICS
    function updateHotspotStatistics() {
        const total = hotspotAccounts.length;

        const counts = {
            Active: 0,
            Suspended: 0,
            Expired: 0
        };

        hotspotAccounts.forEach(account => {
            const status = getEffectiveStatus(account);

            if (counts[status] !== undefined) {
                counts[status]++;
            }
        });

        document.getElementById("hotspotTotal").textContent = total;
        document.getElementById("hotspotActive").textContent = counts.Active;
        document.getElementById("hotspotSuspended").textContent = counts.Suspended;
        document.getElementById("hotspotExpired").textContent = counts.Expired;
    }

    // CREATE HOTSPOT ACCOUNT
    async function createHotspotAccount(event) {
        event.preventDefault();

        const companyId = getCompanyId();

        if (!supabase || !companyId) {
            showMessage("Please check your Supabase connection and company login.", true);
            return;
        }

        const customerId = document.getElementById("hotspotCustomer").value;
        const packageId = document.getElementById("hotspotPackage").value;
        const username = document.getElementById("hotspotUsername").value.trim();
        const startDate = document.getElementById("hotspotStartDate").value;
        const expiryDate = document.getElementById("hotspotExpiryDate").value;
        const status = document.getElementById("hotspotStatus").value;

        if (!customerId || !packageId || !username || !startDate || !expiryDate) {
            showMessage("Please complete all required fields.", true);
            return;
        }

        if (expiryDate < startDate) {
            showMessage("Expiry date cannot be earlier than the start date.", true);
            return;
        }

        if (!customers.some(customer =>
            String(customer.id) === String(customerId)
        )) {
            showMessage("Selected Hotspot customer could not be found.", true);
            return;
        }

        if (!packages.some(pkg =>
            String(pkg.id) === String(packageId)
        )) {
            showMessage("Selected Hotspot package could not be found.", true);
            return;
        }

        const submitButton = document.querySelector(
            "#hotspotForm button[type='submit']"
        );

        if (submitButton) submitButton.disabled = true;

        showMessage("Saving Hotspot account...");

        try {
            const [cloudCustomer, cloudPackage] = await Promise.all([
                findCloudCustomer(customerId, companyId),
                findCloudPackage(packageId, companyId)
            ]);

            if (!cloudCustomer) {
                throw new Error(
                    "Customer was not found in the cloud. Please confirm customer sync first."
                );
            }

            if (!cloudPackage) {
                throw new Error(
                    "Package was not found in the cloud. Please confirm package sync first."
                );
            }

            const { error } = await supabase
                .from("netbill_hotspot_accounts")
                .insert([{
                    company_id: companyId,
                    customer_id: cloudCustomer.id,
                    package_id: cloudPackage.id,
                    hotspot_username: username,
                    account_status: status,
                    start_date: startDate,
                    expiry_date: expiryDate
                }]);

            if (error) throw error;

            document.getElementById("hotspotForm").reset();

            loadLocalOptions();

            showMessage("Hotspot account created successfully!");

            await loadHotspotAccounts();

        } catch (error) {
            console.error("Hotspot creation error:", error);
            showMessage("Could not create Hotspot account: " + error.message, true);

        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    // UPDATE ACCOUNT STATUS
    async function updateHotspotStatus(event) {
        const select = event.target.closest(".hotspot-status");

        if (!select) return;

        const accountId = select.dataset.id;
        const newStatus = select.value;
        const companyId = getCompanyId();

        try {
            const { error } = await supabase
                .from("netbill_hotspot_accounts")
                .update({
                    account_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("id", accountId)
                .eq("company_id", companyId);

            if (error) throw error;

            showMessage("Hotspot account status updated successfully!");

            await loadHotspotAccounts();

        } catch (error) {
            console.error("Hotspot status update error:", error);
            showMessage("Status update failed: " + error.message, true);
            await loadHotspotAccounts();
        }
    }

    // INITIALIZE HOTSPOT MODULE
    function initializeHotspot() {
        const form = document.getElementById("hotspotForm");
        const table = document.getElementById("hotspotList");

        if (!form || !table) return;

        form.addEventListener("submit", createHotspotAccount);
        table.addEventListener("change", updateHotspotStatus);

        document.querySelectorAll(".nav-button").forEach(button => {
            button.addEventListener("click", () => {
                if (button.dataset.page === "hotspot") {
                    loadLocalOptions();
                    loadHotspotAccounts();
                }
            });
        });

        loadLocalOptions();
        loadHotspotAccounts();

        console.log("NetBill Hotspot Management loaded successfully.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeHotspot);
    } else {
        initializeHotspot();
    }

})();
