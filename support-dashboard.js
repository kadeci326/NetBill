
// ==========================================
// NETBILL - CUSTOMER SUPPORT DASHBOARD
// ==========================================

(function () {
    "use strict";

    const STORAGE_KEY = "netbillComplaints";

    function getComplaints() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function createDashboard() {
        const dashboard = document.getElementById("dashboard");

        if (!dashboard ||
            document.getElementById("supportDashboardCard")) return;

        const card = document.createElement("div");
        card.id = "supportDashboardCard";
        card.className = "card";

        card.innerHTML = `
            <h3>Customer Support Overview</h3>

            <p>Monitor customer complaints and support performance.</p>

            <div class="dashboard-cards">
                <div class="card">
                    <h3>Total Complaints</h3>
                    <p id="supportTotal">0</p>
                </div>

                <div class="card">
                    <h3>Open</h3>
                    <p id="supportOpen">0</p>
                </div>

                <div class="card">
                    <h3>In Progress</h3>
                    <p id="supportProgress">0</p>
                </div>

                <div class="card">
                    <h3>Resolved</h3>
                    <p id="supportResolved">0</p>
                </div>
            </div>

            <h3>Recent Customer Complaints</h3>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Subject</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody id="supportRecentList"></tbody>
                </table>
            </div>

            <button type="button" id="refreshSupportDashboard">
                Refresh Support Dashboard
            </button>
        `;

        dashboard.appendChild(card);

        document.getElementById("refreshSupportDashboard")
            .addEventListener("click", displayDashboard);

        displayDashboard();
    }

    function displayDashboard() {
        const complaints = getComplaints();

        const count = status =>
            complaints.filter(item => item.status === status).length;

        document.getElementById("supportTotal").textContent =
            complaints.length;

        document.getElementById("supportOpen").textContent =
            count("Open");

        document.getElementById("supportProgress").textContent =
            count("In Progress");

        document.getElementById("supportResolved").textContent =
            count("Resolved");

        const recentList = document.getElementById("supportRecentList");

        const recent = complaints.slice().sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || ""))
        ).slice(0, 5);

        if (recent.length === 0) {
            recentList.innerHTML = `
                <tr>
                    <td colspan="4">No customer complaints recorded yet.</td>
                </tr>
            `;
            return;
        }

        recentList.innerHTML = recent.map(item => `
            <tr>
                <td>${escapeHTML(item.customerName)}</td>
                <td>${escapeHTML(item.subject)}</td>
                <td>${escapeHTML(item.date)}</td>
                <td>${escapeHTML(item.status)}</td>
            </tr>
        `).join("");
    }

    document.addEventListener("DOMContentLoaded", createDashboard);

    console.log("NetBill support dashboard is ready.");

})();
