
(function () {
    "use strict";

    const db = window.netbillSupabase;

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

    function showMessage(message, success = true) {
        const box = document.getElementById("pppoeMessage");
        if (!box) return;

        box.style.color = success ? "#166534" : "#991b1b";
        box.textContent = message;
    }

    function todayString() {
        const date = new Date();

        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function getStatus(account) {
        if (account.account_status === "Suspended") return "Suspended";

        if (account.expiry_date && account.expiry_date < todayString()) {
            return "Expired";
        }

        return account.account_status;
    }

    function getLocalCustomers() {
        return readLocalData("netbillCustomers").filter(customer =>
            customer.connectionType === "PPPoE"
        );
    }

    function getLocalPackages() {
        return readLocalData("netbillPackages").filter(item =>
            item.connection === "PPPoE"
        );
    }

    function populateDropdowns() {
        const customerSelect = document.getElementById("pppoeCustomer");
        const packageSelect = document.getElementById("pppoePackage");

        if (!customerSelect || !packageSelect) return;

        const selectedCustomer = customerSelect.value;
        const selectedPackage = packageSelect.value;

        const customers = getLocalCustomers();
        const packages = getLocalPackages();

        customerSelect.innerHTML =
            '<option value="">Select PPPoE Customer</option>';

        customers.forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            option.textContent = customer.name + " - " + customer.phone;
            customerSelect.appendChild(option);
        });

        packageSelect.innerHTML =
            '<option value="">Select PPPoE Package</option>';

        packages.forEach(item => {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent =
                item.name + " - " + item.speed + " - Ksh " + item.price;

            packageSelect.appendChild(option);
        });

        customerSelect.value = selectedCustomer;
        packageSelect.value = selectedPackage;
    }

    function updateStatistics(accounts) {
        const total = document.getElementById("pppoeTotal");
        const active = document.getElementById("pppoeActive");
        const suspended = document.getElementById("pppoeSuspended");
        const expired = document.getElementById("pppoeExpired");

        const statuses = accounts.map(account => getStatus(account));

        if (total) total.textContent = accounts.length;

        if (active) {
            active.textContent =
                statuses.filter(status => status === "Active").length;
        }

        if (suspended) {
            suspended.textContent =
                statuses.filter(status => status === "Suspended").length;
        }

        if (expired) {
            expired.textContent =
                statuses.filter(status => status === "Expired").length;
        }
    }

    async function loadAccounts() {
        const list = document.getElementById("pppoeList");
        if (!list) return;

        try {
            if (!db) {
                throw new Error("Supabase connection not found.");
            }

            const companyId = getCompanyId();

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            populateDropdowns();

            const { data, error } = await db
                .from("netbill_pppoe_accounts")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const accounts = data || [];

            updateStatistics(accounts);

            if (accounts.length === 0) {
                list.innerHTML =
                    '<tr><td colspan="7">No PPPoE accounts registered yet.</td></tr>';
                return;
            }

            const customers = readLocalData("netbillCustomers");
            const packages = readLocalData("netbillPackages");

            list.innerHTML = accounts.map(account => {
                const customer = customers.find(item =>
                    String(item.id) === String(account.customer_data_id)
                );

                const item = packages.find(pkg =>
                    String(pkg.id) === String(account.package_data_id)
                );

                const customerName = customer
                    ? customer.name
                    : "Customer record";

                const packageName = item
                    ? item.name
                    : "Package record";

                const status = getStatus(account);

                return `
                    <tr>
                        <td>${escapeHTML(customerName)}</td>
                        <td>${escapeHTML(account.pppoe_username)}</td>
                        <td>${escapeHTML(packageName)}</td>
                        <td>${escapeHTML(account.start_date || "-")}</td>
                        <td>${escapeHTML(account.expiry_date || "-")}</td>
                        <td>${escapeHTML(status)}</td>
                        <td>
                            <select data-status-select="${escapeHTML(account.id)}">
                                <option value="Pending" ${status === "Pending" ? "selected" : ""}>Pending</option>
                                <option value="Active" ${status === "Active" ? "selected" : ""}>Active</option>
                                <option value="Suspended" ${status === "Suspended" ? "selected" : ""}>Suspended</option>
                                <option value="Expired" ${status === "Expired" ? "selected" : ""}>Expired</option>
                            </select>

                            <button type="button"
                                data-status-save="${escapeHTML(account.id)}">
                                Update
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            console.error("PPPoE loading error:", error);

            list.innerHTML =
                '<tr><td colspan="7">Could not load PPPoE accounts.</td></tr>';

            showMessage("LOADING ERROR: " + error.message, false);
        }
    }

    async function createAccount(event) {
        event.preventDefault();

        const button = event.target.querySelector('button[type="submit"]');

        try {
            if (!db) {
                throw new Error("Supabase connection not found.");
            }

            const companyId = getCompanyId();

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            const { data: sessionData, error: sessionError } =
                await db.auth.getSession();

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                throw new Error("Please log in again.");
            }

            const customerId =
                document.getElementById("pppoeCustomer").value;

            const packageId =
                document.getElementById("pppoePackage").value;

            const username =
                document.getElementById("pppoeUsername").value.trim();

            const startDate =
                document.getElementById("pppoeStartDate").value;

            const expiryDate =
                document.getElementById("pppoeExpiryDate").value;

            const status =
                document.getElementById("pppoeStatus").value;

            if (!customerId || !packageId || !username) {
                throw new Error("Please complete all required fields.");
            }

            if (expiryDate < startDate) {
                throw new Error("Expiry date cannot be before start date.");
            }

            const customers = getLocalCustomers();
            const packages = getLocalPackages();

            const customer = customers.find(item =>
                String(item.id) === String(customerId)
            );

            const item = packages.find(pkg =>
                String(pkg.id) === String(packageId)
            );

            if (!customer) {
                throw new Error("Selected PPPoE customer was not found.");
            }

            if (!item) {
                throw new Error("Selected PPPoE package was not found.");
            }

            button.disabled = true;
            button.textContent = "Creating Account...";

            // Find the customer's existing cloud record.
            const { data: onlineCustomers, error: customerError } = await db
                .from("netbill_customers")
                .select("id, customer_data")
                .eq("company_id", companyId);

            if (customerError) throw customerError;

            const onlineCustomer = (onlineCustomers || []).find(row =>
                String(row.customer_data?.id) === String(customer.id)
            );

            if (!onlineCustomer) {
                throw new Error(
                    "Customer is not yet synchronised with Supabase. " +
                    "Wait for cloud sync and try again."
                );
            }

            // Find the selected package's existing cloud record.
            const { data: onlinePackages, error: packageError } = await db
                .from("netbill_packages")
                .select("id, package_data")
                .eq("company_id", companyId);

            if (packageError) throw packageError;

            const onlinePackage = (onlinePackages || []).find(row =>
                String(row.package_data?.id) === String(item.id)
            );

            if (!onlinePackage) {
                throw new Error(
                    "Package is not yet synchronised with Supabase. " +
                    "Wait for cloud sync and try again."
                );
            }

            const newAccount = {
                company_id: companyId,
                customer_id: onlineCustomer.id,
                package_id: onlinePackage.id,
                pppoe_username: username,
                account_status: status,
                start_date: startDate,
                expiry_date: expiryDate
            };

            const { error } = await db
                .from("netbill_pppoe_accounts")
                .insert([newAccount]);

            if (error) throw error;

            showMessage("SUCCESS! PPPoE account created successfully.");

            event.target.reset();

            await loadAccounts();

        } catch (error) {
            console.error("PPPoE account creation error:", error);

            showMessage("CREATION ERROR: " + error.message, false);

        } finally {
            button.disabled = false;
            button.textContent = "Create PPPoE Account";
        }
    }

    async function updateAccountStatus(accountId) {
        try {
            const companyId = getCompanyId();

            const select = document.querySelector(
                `[data-status-select="${accountId}"]`
            );

            if (!select) return;

            const newStatus = select.value;

            const { error } = await db
                .from("netbill_pppoe_accounts")
                .update({
                    account_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq("id", accountId)
                .eq("company_id", companyId);

            if (error) throw error;

            showMessage("SUCCESS! PPPoE account status updated.");

            await loadAccounts();

        } catch (error) {
            console.error("PPPoE status update error:", error);
            showMessage("UPDATE ERROR: " + error.message, false);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("pppoeForm");
        const list = document.getElementById("pppoeList");

        if (!db) {
            showMessage("Supabase connection not found.", false);
            return;
        }

        if (form) {
            form.addEventListener("submit", createAccount);
        }

        if (list) {
            list.addEventListener("click", function (event) {
                const button = event.target.closest("[data-status-save]");

                if (button) {
                    updateAccountStatus(button.dataset.statusSave);
                }
            });
        }

        loadAccounts();

        document.querySelectorAll(".nav-button").forEach(button => {
            button.addEventListener("click", function () {
                if (this.dataset.page === "pppoe") {
                    loadAccounts();
                }
            });
        });
    });

})();
