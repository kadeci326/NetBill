 
// ==========================================
// NETBILL - HOTSPOT VOUCHER MANAGEMENT
// WITH PRINTABLE VOUCHER SLIPS
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

        dropdown.removeEventListener("change", updateSelectedPackage);
        dropdown.addEventListener("change", updateSelectedPackage);
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

    // ==========================================
    // PRINTING FEATURES
    // ==========================================

    function getPackageName(voucher) {
        const packageItem = hotspotPackages.find(localPackage =>
            findCloudPackage(localPackage)?.id === voucher.package_id
        );

        return packageItem ? packageItem.name : "Hotspot Package";
    }

    function createPrintToolbar() {
        const table = $("voucherList");

        if (!table || $("voucherPrintToolbar")) return;

        const toolbar = document.createElement("div");

        toolbar.id = "voucherPrintToolbar";

        toolbar.style.cssText = `
            display:flex;
            align-items:center;
            flex-wrap:wrap;
            gap:12px;
            margin:15px 0;
            padding:12px;
            background:#f1f5f9;
            border-radius:8px;
        `;

        toolbar.innerHTML = `
            <label style="display:flex;align-items:center;gap:6px;">
                <input type="checkbox" id="voucherSelectAll">
                Select All
            </label>

            <button type="button" id="printSelectedVouchers">
                Print Selected
            </button>

            <span id="voucherSelectedCount">
                0 selected
            </span>
        `;

        table.parentNode.insertBefore(toolbar, table);

        $("voucherSelectAll").addEventListener("change", function () {
            document.querySelectorAll(".voucher-select").forEach(checkbox => {
                checkbox.checked = this.checked;
            });

            updateSelectedCount();
        });

        $("printSelectedVouchers").addEventListener("click", function () {
            const selectedIds = Array.from(
                document.querySelectorAll(".voucher-select:checked")
            ).map(checkbox => checkbox.value);

            const selectedVouchers = vouchers.filter(voucher =>
                selectedIds.includes(String(voucher.id))
            );

            if (selectedVouchers.length === 0) {
                alert("Please select at least one voucher to print.");
                return;
            }

            printVoucherSlips(selectedVouchers);
        });
    }

    function updateSelectedCount() {
        const selected = document.querySelectorAll(
            ".voucher-select:checked"
        ).length;

        const count = $("voucherSelectedCount");

        if (count) {
            count.textContent = selected + " selected";
        }

        const allCheckboxes = document.querySelectorAll(".voucher-select");
        const selectAll = $("voucherSelectAll");

        if (selectAll) {
            selectAll.checked =
                allCheckboxes.length > 0 &&
                selected === allCheckboxes.length;
        }
    }

    function printVoucherSlips(selectedVouchers) {
        if (!selectedVouchers || selectedVouchers.length === 0) {
            alert("No vouchers available to print.");
            return;
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=700"
        );

        if (!printWindow) {
            alert("Please allow pop-ups in your browser to print vouchers.");
            return;
        }

        const companyName =
            localStorage.getItem("netbillCompanyName") ||
            "NETBILL INTERNET SERVICES";

        const slips = selectedVouchers.map(voucher => `
            <div class="voucher-slip">
                <div class="slip-header">
                    <h2>${escapeHTML(companyName)}</h2>
                    <p>HOTSPOT INTERNET VOUCHER</p>
                </div>

                <div class="slip-body">
                    <p class="label">YOUR VOUCHER CODE</p>

                    <div class="voucher-code">
                        ${escapeHTML(voucher.voucher_code)}
                    </div>

                    <div class="details">
                        <div>
                            <span>Package</span>
                            <strong>${escapeHTML(getPackageName(voucher))}</strong>
                        </div>

                        <div>
                            <span>Duration</span>
                            <strong>${Number(voucher.duration_minutes)} minutes</strong>
                        </div>

                        <div>
                            <span>Price</span>
                            <strong>${escapeHTML(formatMoney(voucher.price))}</strong>
                        </div>

                        <div>
                            <span>Status</span>
                            <strong>${escapeHTML(effectiveStatus(voucher))}</strong>
                        </div>
                    </div>

                    <p class="instruction">
                        Connect to the Wi-Fi network and enter this voucher
                        code when prompted to access the internet.
                    </p>
                </div>

                <div class="slip-footer">
                    Thank you for choosing ${escapeHTML(companyName)}
                </div>
            </div>
        `).join("");

        printWindow.document.open();

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>NetBill Hotspot Vouchers</title>

                <style>
                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family: Arial, sans-serif;
                        margin: 15px;
                        color: #172033;
                    }

                    .voucher-slip {
                        width: 100%;
                        max-width: 420px;
                        margin: 0 auto 20px;
                        border: 2px dashed #123456;
                        border-radius: 10px;
                        overflow: hidden;
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    .slip-header {
                        background: #123456;
                        color: white;
                        text-align: center;
                        padding: 16px 10px;
                    }

                    .slip-header h2 {
                        margin: 0 0 6px;
                        font-size: 20px;
                    }

                    .slip-header p {
                        margin: 0;
                        font-size: 12px;
                        letter-spacing: 2px;
                    }

                    .slip-body {
                        padding: 18px;
                        text-align: center;
                    }

                    .label {
                        font-size: 12px;
                        font-weight: bold;
                        color: #64748b;
                    }

                    .voucher-code {
                        font-size: 27px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        color: #123456;
                        padding: 14px 5px;
                        border: 1px solid #cbd5e1;
                        border-radius: 7px;
                        margin: 12px 0 18px;
                    }

                    .details {
                        text-align: left;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }

                    .details div {
                        display: flex;
                        justify-content: space-between;
                        gap: 10px;
                        padding: 7px 0;
                        border-bottom: 1px solid #eee;
                        font-size: 13px;
                    }

                    .details span {
                        color: #64748b;
                    }

                    .details strong {
                        text-align: right;
                    }

                    .instruction {
                        font-size: 11px;
                        line-height: 1.5;
                        margin-top: 16px;
                    }

                    .slip-footer {
                        background: #f1f5f9;
                        text-align: center;
                        padding: 10px;
                        font-size: 11px;
                    }

                    @media print {
                        body {
                            margin: 8mm;
                        }

                        .voucher-slip {
                            margin-bottom: 10mm;
                        }
                    }
                </style>
            </head>

            <body>
                ${slips}

                <script>
                    window.onload = function () {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    // ==========================================
    // STATISTICS
    // ==========================================

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

    // ==========================================
    // DISPLAY VOUCHERS
    // ==========================================

    function renderVouchers() {
        const table = $("voucherList");

        if (!table) return;

        updateStatistics();
        createPrintToolbar();

        if (vouchers.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="8">No vouchers generated yet.</td>
                </tr>
            `;

            updateSelectedCount();
            return;
        }

        table.innerHTML = vouchers.map(voucher => {
            const packageName = getPackageName(voucher);
            const status = effectiveStatus(voucher);

            const options = ["Unused", "Used", "Expired", "Disabled"]
                .map(option => `
                    <option value="${option}" ${status === option ? "selected" : ""}>
                        ${option}
                    </option>
                `).join("");

            return `
                <tr>
                    <td>
                        <input
                            type="checkbox"
                            class="voucher-select"
                            value="${escapeHTML(voucher.id)}"
                            aria-label="Select voucher ${escapeHTML(voucher.voucher_code)}">
                    </td>

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
                            class="print-voucher"
                            data-id="${escapeHTML(voucher.id)}">
                            Print
                        </button>

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

        // Add a selection heading to the table.
        const headerRow = table.closest("table")?.querySelector("thead tr");

        if (headerRow && !headerRow.querySelector(".voucher-select-heading")) {
            const heading = document.createElement("th");
            heading.className = "voucher-select-heading";
            heading.textContent = "Select";

            headerRow.insertBefore(heading, headerRow.firstElementChild);
        }

        updateSelectedCount();

        table.querySelectorAll(".voucher-select").forEach(checkbox => {
            checkbox.addEventListener("change", updateSelectedCount);
        });
    }

    // ==========================================
    // LOAD VOUCHERS FROM SUPABASE
    // ==========================================

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

    // ==========================================
    // GENERATE VOUCHERS
    // ==========================================

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

    // ==========================================
    // UPDATE VOUCHER STATUS
    // ==========================================

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

    // ==========================================
    // DELETE VOUCHER
    // ==========================================

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

    // ==========================================
    // TABLE ACTIONS
    // ==========================================

    function handleTableActions(event) {
        const statusSelect = event.target.closest(".voucher-status");

        if (statusSelect) {
            updateVoucherStatus(
                statusSelect.dataset.id,
                statusSelect.value
            );
            return;
        }

        const printButton = event.target.closest(".print-voucher");

        if (printButton) {
            const voucher = vouchers.find(item =>
                item.id === printButton.dataset.id
            );

            if (voucher) {
                printVoucherSlips([voucher]);
            }

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

    // ==========================================
    // INITIALIZATION
    // ==========================================

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
