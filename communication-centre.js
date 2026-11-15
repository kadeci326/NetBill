 
// ==========================================
// NETBILL - UNIFIED CUSTOMER COMMUNICATION CENTRE
// ==========================================

(function () {
    "use strict";

    const HISTORY_KEYS = {
        payment: "netbillPaymentNotificationHistory",
        general: "netbillNotificationHistory",
        welcome: "netbillWelcomeSMSHistory",
        expiry: "netbillExpirySMSHistory"
    };

    function readHistory(key) {
        try {
            const data = JSON.parse(
                localStorage.getItem(key) || "[]"
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
            "'": "&#039;"
        })[char]);
    }

    function getAllMessages() {
        const messages = [];

        readHistory(HISTORY_KEYS.payment).forEach(item => {
            messages.push({
                customer: item.customerName || item.customer || "Customer",
                phone: item.phone || "",
                type: "Payment SMS",
                date: item.date || "",
                status: item.status || "Prepared",
                message: item.message || "",
                error: item.error || ""
            });
        });

        readHistory(HISTORY_KEYS.general).forEach(item => {
            messages.push({
                customer: item.customer || "Customer",
                phone: item.phone || "",
                type: item.method || "SMS / WhatsApp",
                date: item.date || "",
                status: "Prepared",
                message: item.message || "",
                error: ""
            });
        });

        readHistory(HISTORY_KEYS.welcome).forEach(item => {
            messages.push({
                customer: item.customerName || "Customer",
                phone: item.phone || "",
                type: "Welcome SMS",
                date: item.date || "",
                status: item.status || "Unknown",
                message: item.message || "Welcome message record",
                error: item.error || ""
            });
        });

        readHistory(HISTORY_KEYS.expiry).forEach(item => {
            messages.push({
                customer: item.customer || "Customer",
                phone: item.phone || "",
                type: "Expiry Reminder SMS",
                date: item.date || "",
                status: item.status || "Unknown",
                message: item.message || "Subscription expiry reminder",
                error: item.error || ""
            });
        });

        return messages.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }

    function createCentre() {
        const navigation = document.querySelector(".sidebar nav");
        const main = document.querySelector(".main-content");

        if (!navigation || !main) {
            console.error("Communication Centre could not find the navigation or main content.");
            return;
        }

        if (document.getElementById("communicationCentre")) return;

        const navButton = document.createElement("button");
        navButton.className = "nav-button";
        navButton.dataset.page = "communicationCentre";
        navButton.textContent = "Communication Centre";
        navigation.appendChild(navButton);

        const page = document.createElement("section");
        page.className = "page";
        page.id = "communicationCentre";
        page.style.display = "none";

        page.innerHTML = `
            <h2>Customer Communication Centre</h2>

            <p>
                View customer messages from your existing NetBill
                notification systems in one place.
            </p>

            <div class="dashboard-cards">
                <div class="card">
                    <h3>Total Messages</h3>
                    <p id="commTotal">0</p>
                </div>

                <div class="card">
                    <h3>Accepted</h3>
                    <p id="commAccepted">0</p>
                </div>

                <div class="card">
                    <h3>Failed</h3>
                    <p id="commFailed">0</p>
                </div>

                <div class="card">
                    <h3>Prepared / Other</h3>
                    <p id="commPending">0</p>
                </div>
            </div>

            <div class="card">
                <h3>Communication History</h3>

                <input
                    type="search"
                    id="commSearch"
                    placeholder="Search customer, phone, type or message..."
                    style="width:100%;padding:12px;margin-bottom:12px;"
                >

                <button type="button" id="commRefresh">
                    Refresh Communication History
                </button>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Message Type</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody id="commHistoryList"></tbody>
                    </table>
                </div>

                <p style="font-size:13px;color:#666;">
                    Accepted means the SMS provider accepted the request.
                    It does not confirm delivery to the customer's phone.
                    Prepared means a message was prepared or opened in a
                    messaging application.
                </p>
            </div>
        `;

        main.appendChild(page);

        navButton.addEventListener("click", function () {
            document.querySelectorAll(".page").forEach(section => {
                section.style.display = "none";
            });

            document.querySelectorAll(".nav-button").forEach(button => {
                button.classList.remove("active");
            });

            page.style.display = "block";
            navButton.classList.add("active");

            displayHistory();
        });

        document.getElementById("commRefresh")
            .addEventListener("click", displayHistory);

        document.getElementById("commSearch")
            .addEventListener("input", displayHistory);

        displayHistory();
    }

    function displayHistory() {
        const totalMessages = getAllMessages();

        const search = (
            document.getElementById("commSearch")?.value || ""
        ).toLowerCase();

        const accepted = totalMessages.filter(
            item => item.status === "Accepted"
        ).length;

        const failed = totalMessages.filter(
            item => item.status === "Failed"
        ).length;

        document.getElementById("commTotal").textContent =
            totalMessages.length;

        document.getElementById("commAccepted").textContent =
            accepted;

        document.getElementById("commFailed").textContent =
            failed;

        document.getElementById("commPending").textContent =
            totalMessages.length - accepted - failed;

        const filtered = totalMessages.filter(item => {
            const searchable = [
                item.customer,
                item.phone,
                item.type,
                item.message,
                item.status
            ].join(" ").toLowerCase();

            return searchable.includes(search);
        });

        const table = document.getElementById("commHistoryList");

        if (filtered.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6">
                        No matching communication records found.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = filtered.map(item => {
            const statusColor =
                item.status === "Accepted" ? "green" :
                item.status === "Failed" ? "red" :
                "#b7791f";

            return `
                <tr>
                    <td>${escapeHTML(item.customer)}</td>
                    <td>${escapeHTML(item.phone)}</td>
                    <td>${escapeHTML(item.type)}</td>
                    <td>${escapeHTML(item.date)}</td>
                    <td>
                        <strong style="color:${statusColor}">
                            ${escapeHTML(item.status)}
                        </strong>
                    </td>
                    <td>
                        <details>
                            <summary>View Message</summary>
                            <p>${escapeHTML(item.message)}</p>
                            ${
                                item.error
                                ? `<p style="color:red;">${escapeHTML(item.error)}</p>`
                                : ""
                            }
                        </details>
                    </td>
                </tr>
            `;
        }).join("");
    }

    document.addEventListener("DOMContentLoaded", createCentre);

    console.log("NetBill Unified Communication Centre loaded.");

})();
