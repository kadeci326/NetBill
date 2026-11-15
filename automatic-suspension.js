
// ==========================================
// NETBILL - AUTOMATIC CUSTOMER SUSPENSION
// ==========================================

(function () {
    "use strict";

    const CUSTOMER_KEY = "netbillCustomers";
    const SUSPENSION_KEY = "netbillSuspensionRecords";

    function getToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
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

    function readArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("NetBill could not read:", key, error);
            return [];
        }
    }

    function saveSuspensionRecords(records) {
        localStorage.setItem(
            SUSPENSION_KEY,
            JSON.stringify(records)
        );
    }

    // CHECK ALL CUSTOMER SUBSCRIPTIONS
    function checkExpiredCustomers() {
        const customers = readArray(CUSTOMER_KEY);
        const previousRecords = readArray(SUSPENSION_KEY);
        const today = getToday();

        const records = customers.map(customer => {
            const previous = previousRecords.find(
                record =>
                    String(record.customerId) === String(customer.id)
            );

            const expired = Boolean(
                customer.expiryDate &&
                customer.expiryDate < today
            );

            return {
                customerId: customer.id,
                customerName: customer.name || "Unknown customer",
                phone: customer.phone || "",
                expiryDate: customer.expiryDate || "",
                status: expired ? "Suspended" : "Active",
                suspendedAt: expired
                    ? (previous?.status === "Suspended"
                        ? previous.suspendedAt
                        : new Date().toISOString())
                    : "",
                reason: expired
                    ? "Subscription expired"
                    : "Subscription is valid",
                updatedAt: new Date().toISOString()
            };
        });

        saveSuspensionRecords(records);

        displaySuspensionPanel(records);

        return records;
    }

    // DISPLAY SUSPENSION PANEL
    function displaySuspensionPanel(records) {
        const customersPage = document.getElementById("customers");

        if (!customersPage) return;

        let panel = document.getElementById(
            "netbillAutomaticSuspensionPanel"
        );

        if (!panel) {
            panel = document.createElement("div");
            panel.id = "netbillAutomaticSuspensionPanel";
            panel.className = "card";

            customersPage.appendChild(panel);
        }

        const suspended = records.filter(
            record => record.status === "Suspended"
        );

        const active = records.filter(
            record => record.status === "Active"
        );

        panel.innerHTML = `
            <h3>Automatic Subscription Suspension</h3>

            <p>
                NetBill automatically checks customer expiry dates
                and updates their suspension status.
            </p>

            <div class="dashboard-cards">
                <div class="card">
                    <h4>Suspended Customers</h4>
                    <h2>${suspended.length}</h2>
                </div>

                <div class="card">
                    <h4>Active Customers</h4>
                    <h2>${active.length}</h2>
                </div>
            </div>

            <h3>Suspension Records</h3>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Expiry Date</th>
                            <th>Access Status</th>
                            <th>Reason</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${
                            records.length
                            ? records.map(record => `
                                <tr>
                                    <td>${escapeHTML(record.customerName)}</td>
                                    <td>${escapeHTML(record.phone)}</td>
                                    <td>${escapeHTML(record.expiryDate || "-")}</td>
                                    <td>
                                        <strong style="color:${
                                            record.status === "Suspended"
                                            ? "#dc2626"
                                            : "#168447"
                                        }">
                                            ${escapeHTML(record.status)}
                                        </strong>
                                    </td>
                                    <td>${escapeHTML(record.reason)}</td>
                                </tr>
                            `).join("")
                            : '<tr><td colspan="5">No customers registered yet.</td></tr>'
                        }
                    </tbody>
                </table>
            </div>

            <p>
                <strong>Important:</strong>
                These are NetBill suspension records only.
                Actual internet disconnection requires a tested
                MikroTik router connection.
            </p>

            <button type="button" id="netbillCheckSuspensions">
                Check Subscriptions Now
            </button>

            <p id="netbillSuspensionMessage"></p>
        `;

        const button = document.getElementById(
            "netbillCheckSuspensions"
        );

        if (button) {
            button.addEventListener("click", function () {
                const updatedRecords = checkExpiredCustomers();

                const message = document.getElementById(
                    "netbillSuspensionMessage"
                );

                if (message) {
                    message.style.color = "green";
                    message.textContent =
                        "Subscription check completed successfully!";
                }
            });
        }
    }

    // RUN WHEN NETBILL OPENS
    document.addEventListener("DOMContentLoaded", function () {
        checkExpiredCustomers();
    });

    // CHECK WHEN USER RETURNS TO NETBILL
    window.addEventListener("focus", checkExpiredCustomers);

    document.addEventListener(
        "visibilitychange",
        function () {
            if (!document.hidden) {
                checkExpiredCustomers();
            }
        }
    );

    // CHECK EVERY MINUTE WHILE NETBILL IS OPEN
    setInterval(checkExpiredCustomers, 60000);

    // PUBLIC FUNCTION
    window.checkNetBillSuspensions = checkExpiredCustomers;

})();
