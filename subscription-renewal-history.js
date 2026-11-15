
// ==========================================
// NETBILL - SUBSCRIPTION RENEWAL HISTORY
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEY = "netbillRenewalHistory";

    function readHistory() {
        try {
            const data = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("NetBill renewal history error:", error);
            return [];
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function displayHistory() {
        const tableBody = document.getElementById(
            "subscriptionRenewalHistoryList"
        );

        const countElement = document.getElementById(
            "renewalHistoryCount"
        );

        if (!tableBody) return;

        const history = readHistory().sort(function (a, b) {
            return String(b.renewalDate || "")
                .localeCompare(String(a.renewalDate || ""));
        });

        if (countElement) {
            countElement.textContent = history.length;
        }

        if (history.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No subscription renewals recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = history.map(function (item) {
            return `
                <tr>
                    <td>${escapeHTML(item.customerName)}</td>
                    <td>${escapeHTML(item.package)}</td>
                    <td>${escapeHTML(item.previousExpiryDate)}</td>
                    <td>${escapeHTML(item.newExpiryDate)}</td>
                    <td>${escapeHTML(item.renewalDate)}</td>
                </tr>
            `;
        }).join("");
    }

    function createHistorySection() {
        const reportsSection = document.getElementById("reports");

        if (!reportsSection) {
            console.warn("NetBill Reports section was not found.");
            return;
        }

        if (document.getElementById("subscriptionRenewalHistoryCard")) {
            displayHistory();
            return;
        }

        const card = document.createElement("div");

        card.id = "subscriptionRenewalHistoryCard";
        card.className = "card";

        card.innerHTML = `
            <h3>Subscription Renewal History</h3>

            <p>
                Total successful renewals:
                <strong id="renewalHistoryCount">0</strong>
            </p>

            <button type="button" id="refreshRenewalHistory">
                Refresh History
            </button>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Package</th>
                            <th>Previous Expiry</th>
                            <th>New Expiry</th>
                            <th>Renewal Date</th>
                        </tr>
                    </thead>

                    <tbody id="subscriptionRenewalHistoryList"></tbody>
                </table>
            </div>
        `;

        reportsSection.appendChild(card);

        document.getElementById("refreshRenewalHistory")
            .addEventListener("click", displayHistory);

        displayHistory();
    }

    document.addEventListener("DOMContentLoaded", createHistorySection);

    console.log("NetBill subscription renewal history is ready.");

})();
