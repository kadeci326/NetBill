
// ==========================================
// NETBILL - HOTSPOT VOUCHER MANAGEMENT
// ==========================================

(function () {
    "use strict";

    let vouchers = [];
    let hotspotPackages = [];
    let cloudPackages = [];

    const supabase = window.netbillSupabase;

    const $ = (id) => document.getElementById(id);

    function getCompanyId() {
        return localStorage.getItem("netbillCompanyId");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character];
        });
    }

    function formatMoney(amount) {
        return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function showMessage(message, success) {
        const element = $("voucherMessage");

        if (!element) return;

        element.textContent = message;
        element.style.color = success ? "green" : "red";
    }

    function getLocalPackages() {
        try {
            const saved = JSON.parse(
                localStorage.getItem("netbillPackages") || "[]"
            );

            return Array.isArray(saved)
                ? saved.filter(packageItem =>
                    packageItem.connection === "Hotspot"
                )
                : [];
        } catch (error) {
            console.error("Could not read Hotspot packages:", error);
            return [];
        }
    }

    async function loadCloudPackages() {
        const companyId = getCompanyId();

        if (!companyId) {
            throw new Error("Company ID not found. Please check your company login.");
        }

        const { data, error } = await supabase
            .from("netbill_packages")
            .select("id, package_data")
            .eq("company_id", companyId);

        if (error) throw error;

        cloudPackages = data || [];
    }

    function findCloudPackage(localPackage) {
        return cloudPackages.find(item =>
            String(item.package_data?.id) === String(localPackage.id)
        );
    }

    function populatePackageDropdown() {
        const dropdown = $("voucherPackage");

        if (!dropdown) return;

        dropdown.innerHTML =
            '<option value="">Select Hotspot Package</option>';

        hotspotPackages.forEach((packageItem, index) => {
            const option = document.createElement("option");

            option.value = String(index);
            option.textContent =
                `${packageItem.name} - ${packageItem.speed || ""} - ${formatMoney(packageItem.price)}`;

            dropdown.appendChild(option);
        });

        dropdown.addEventListener("change", updateSelectedPackage, {
            once: true
        });
    }

    function updateSelectedPackage() {
        const dropdown = $("voucherPackage");

        if (!dropdown) return;

        const selected = hotspotPackages[Number(dropdown.value)];

        if (!selected) return;

        $("voucherPrice").value = Number(selected.price || 0);

        const durationMap = {
            Daily: 1440,
            Weekly: 10080,
            Monthly: 43200
        };

        $("voucherDuration").value =
            durationMap[selected.duration] || 1440;
    }

    function generateVoucherCode() {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const randomValues = new Uint8Array(10);

        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomValues);
        } else {
            for (let i = 0; i < randomValues.length; i++) {
                randomValues[i] = Math.floor(Math.random() * 256);
            }
        }

        let code = "";

        for (let i = 0; i < randomValues.length; i++) {
            code += characters[randomValues[i] % characters.length];
        }

        return code.match(/.{1,5}/g).join("-");
    }

    function getExpiryDate() {
        const value = $("voucherExpiry")?.value;

        if (!value) return null;

        return new Date(value + "T23:59:59").toISOString();
    }

    function effectiveStatus(voucher) {
        if (
            voucher.voucher_status !== "Used" &&
            voucher.voucher_status !== "Disabled" &&
            voucher.expires_at &&
            new Date(voucher.expires_at).getTime() < Date.now()
        ) {
            return "Expired";
        }

        return voucher.voucher_status;
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-KE");
    }

    function updateStatistics() {
        const total = vouchers.length;

        const unused = vouchers.filter(v =>
            effectiveStatus(v) === "Unused"
        ).length;

        const used = vouchers.filter(v =>
            effectiveStatus(v) === "Used"
        ).length;

        const expired = vouchers.filter(v =>
            effectiveStatus(v) === "Expired"
        ).length;

        if ($("voucherTotal")) $("voucherTotal").textContent = total;
        if ($("voucherUnused")) $("voucherUnused").textContent = unused;
        if ($("voucherUsed")) $("voucherUsed").textContent = used;
        if ($("voucherExpired")) $("voucherExpired").textContent = expired;
    }

    function renderVouchers() {
        const table = $("voucherList");

        if (!table) return;

        updateStatistics();

        if (vouchers.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7">No vouchers generated yet.</td>
                </tr>
            `;
            return;
        }

        table.innerHTML = vouchers.map(voucher => {
            const packageItem = hotspotPackages.find(localPackage =>
                findCloudPackage(localPackage)?.id === voucher.package_id
            );

            const packageName = packageItem
                ? packageItem.name
                : "Package unavailable";

            const status = effectiveStatus(voucher);

            const options = ["Unused", "Used", "Expired", "Disabled"]
                .map(option => `
                    <option value="${option}" ${status === option ? "selected" : ""}>
                        ${option}
                    </option>
                `).join("");

            return `
                <tr>
                    <td><strong>${escapeHTML(voucher.voucher_code)}</strong></td>
                    <td>${escapeHTML(packageName)}</td>
                    <td>${Number(voucher.duration_minutes)} minutes</td>
                    <td>${formatMoney(voucher.price)}</td>
                    <td>
                        <select class="voucher-status"
                            data-id="${escapeHTML(voucher.id)}"
                            aria-label="Voucher status">
                            ${options}
                        </select>
                    </td>
                    <td>${formatDate(voucher.created_at)}</td>
                    <td>
                        <button type="button"
                            class="copy-voucher"
                            data-code="${escapeHTML(voucher.voucher_code)}">
                            Copy Code
                        </button>
                        <button type="button"
                            class="delete-voucher"
                            data-id="${escapeHTML(voucher.id)}">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    async function loadVouchers() {
        if (!supabase) {
            showMessage("Supabase connection is not available.", false);
            return;
        }

        const companyId = getCompanyId();

        if (!companyId) {
            showMessage("Company ID not found. Please log in again.", false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("netbill_hotspot_vouchers")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            vouchers = data || [];
            renderVouchers();

        } catch (error) {
            console.error("Voucher loading error:", error);
            showMessage("Could not load vouchers: " + error.message, false);
        }
    }

    async function generateVouchers(event) {
        event.preventDefault();

        if (!supabase) {
            showMessage("Supabase connection is not available.", false);
            return;
        }

        const companyId = getCompanyId();

        if (!companyId) {
            showMessage("Company ID not found. Please log in again.", false);
            return;
        }

        const selectedIndex = $("voucherPackage").value;
        const packageItem = hotspotPackages[Number(selectedIndex)];

        const count = Number($("voucherCount").value);
        const duration = Number($("voucherDuration").value);
        const price = Number($("voucherPrice").value);

        if (!packageItem) {
            showMessage("Please select a Hotspot package.", false);
            return;
        }

        if (!Number.isInteger(count) || count < 1 || count > 100) {
            showMessage("Generate between 1 and 100 vouchers at a time.", false);
            return;
        }

        if (!Number.isInteger(duration) || duration < 1) {
            showMessage("Enter a valid voucher duration in minutes.", false);
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            showMessage("Enter a valid voucher price.", false);
            return;
        }

        const cloudPackage = findCloudPackage(packageItem);

        if (!cloudPackage) {
            showMessage(
                "This package was not found in the cloud database. Please check that it has synced.",
                false
            );
            return;
        }

        const button = $("voucherForm").querySelector(
            'button[type="submit"]'
        );

        button.disabled = true;
        button.textContent = "Generating...";

        try {
            const codes = new Set();

            while (codes.size < count) {
                codes.add(generateVoucherCode());
            }

            const expiry = getExpiryDate();

            const records = Array.from(codes).map(code => ({
                company_id: companyId,
                package_id: cloudPackage.id,
                voucher_code: code,
                voucher_status: "Unused",
                duration_minutes: duration,
                price: price,
                expires_at: expiry
            }));

            const { error } = await supabase
                .from("netbill_hotspot_vouchers")
                .insert(records);

            if (error) throw error;

            showMessage(
                `${count} voucher(s) generated successfully!`,
                true
            );

            $("voucherForm").reset();
            $("voucherCount").value = 1;
            $("voucherDuration").value = 1440;
            $("voucherPrice").value = 0;

            await loadVouchers();

        } catch (error) {
            console.error("Voucher generation error:", error);

            showMessage(
                "Voucher generation failed: " + error.message,
                false
            );
        } finally {
            button.disabled = false;
            button.textContent = "Generate Vouchers";
        }
    }

    async function updateVoucherStatus(id, status) {
        const voucher = vouchers.find(item => item.id === id);

        if (!voucher) return;

        const updateData = {
            voucher_status: status,
            redeemed_at: status === "Used"
                ? (voucher.redeemed_at || new Date().toISOString())
                : null
        };

        const { error } = await supabase
            .from("netbill_hotspot_vouchers")
            .update(updateData)
            .eq("id", id)
            .eq("company_id", getCompanyId());

        if (error) {
            alert("Could not update voucher: " + error.message);
            await loadVouchers();
            return;
        }

        await loadVouchers();
    }

    async function deleteVoucher(id) {
        const confirmed = confirm(
            "Are you sure you want to delete this voucher?"
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("netbill_hotspot_vouchers")
            .delete()
            .eq("id", id)
            .eq("company_id", getCompanyId());

        if (error) {
            alert("Could not delete voucher: " + error.message);
            return;
        }

        await loadVouchers();
    }

    function handleTableActions(event) {
        const statusSelect = event.target.closest(".voucher-status");

        if (statusSelect) {
            updateVoucherStatus(
                statusSelect.dataset.id,
                statusSelect.value
            );
            return;
        }

        const copyButton = event.target.closest(".copy-voucher");

        if (copyButton) {
            const code = copyButton.dataset.code;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code)
                    .then(() => alert("Voucher code copied: " + code))
                    .catch(() => prompt("Copy this voucher code:", code));
            } else {
                prompt("Copy this voucher code:", code);
            }

            return;
        }

        const deleteButton = event.target.closest(".delete-voucher");

        if (deleteButton) {
            deleteVoucher(deleteButton.dataset.id);
        }
    }

    async function initializeVoucherManagement() {
        if (!supabase) {
            showMessage("Supabase connection is not available.", false);
            return;
        }

        hotspotPackages = getLocalPackages();

        try {
            await loadCloudPackages();
            populatePackageDropdown();
            await loadVouchers();
        } catch (error) {
            console.error("Voucher module initialization error:", error);
            showMessage(error.message, false);
        }
    }

    function start() {
        const form = $("voucherForm");
        const table = $("voucherList");

        if (!form || !table) return;

        form.addEventListener("submit", generateVouchers);
        table.addEventListener("click", handleTableActions);
        table.addEventListener("change", handleTableActions);

        initializeVoucherManagement();

        document.querySelectorAll('.nav-button[data-page="vouchers"]')
            .forEach(button => {
                button.addEventListener("click", loadVouchers);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
