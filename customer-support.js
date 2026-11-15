
// ==========================================
// NETBILL - CUSTOMER SUPPORT & COMPLAINTS
// ==========================================

(function () {
    "use strict";

    const CUSTOMER_KEY = "netbillCustomers";
    const COMPLAINT_KEY = "netbillComplaints";

    function readData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveComplaints(data) {
        localStorage.setItem(COMPLAINT_KEY, JSON.stringify(data));
    }

    function safe(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function today() {
        const date = new Date();
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function createSupportSection() {
        const customersPage = document.getElementById("customers");

        if (!customersPage ||
            document.getElementById("netbillSupportCard")) return;

        const card = document.createElement("div");
        card.id = "netbillSupportCard";
        card.className = "card";

        card.innerHTML = `
            <h3>Customer Support & Complaints</h3>
            <p>Register customer complaints and track their progress.</p>

            <form id="complaintForm">

                <label for="complaintCustomer">Customer</label>
                <select id="complaintCustomer" required>
                    <option value="">Select Customer</option>
                </select>

                <label for="complaintSubject">Complaint Subject</label>
                <input id="complaintSubject" type="text"
                    placeholder="e.g. Internet is slow" required>

                <label for="complaintDescription">Complaint Details</label>
                <textarea id="complaintDescription"
                    placeholder="Describe the customer's problem..."
                    required></textarea>

                <button type="submit">Register Complaint</button>
                <p id="complaintMessage"></p>
            </form>

            <hr>

            <h3>Complaint Summary</h3>
            <p>Total complaints: <strong id="totalComplaints">0</strong></p>
            <p>Open: <strong id="openComplaints">0</strong></p>
            <p>In Progress: <strong id="progressComplaints">0</strong></p>
            <p>Resolved: <strong id="resolvedComplaints">0</strong></p>

            <h3>Complaint Records</h3>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Subject</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th>Solution</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="complaintList"></tbody>
                </table>
            </div>
        `;

        customersPage.appendChild(card);

        document.getElementById("complaintForm")
            .addEventListener("submit", registerComplaint);

        document.getElementById("complaintList")
            .addEventListener("click", handleComplaintAction);

        refreshCustomerList();
        displayComplaints();
    }

    function refreshCustomerList() {
        const select = document.getElementById("complaintCustomer");
        if (!select) return;

        const previousValue = select.value;
        const customers = readData(CUSTOMER_KEY);

        select.innerHTML = '<option value="">Select Customer</option>';

        customers.forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });

        select.value = previousValue;
    }

    function registerComplaint(event) {
        event.preventDefault();

        const customerId = document.getElementById("complaintCustomer").value;
        const subject = document.getElementById("complaintSubject").value.trim();
        const description = document.getElementById("complaintDescription").value.trim();
        const message = document.getElementById("complaintMessage");

        const customers = readData(CUSTOMER_KEY);
        const customer = customers.find(
            item => String(item.id) === String(customerId)
        );

        if (!customer || !subject || !description) {
            message.style.color = "red";
            message.textContent = "Please complete all complaint details.";
            return;
        }

        const complaints = readData(COMPLAINT_KEY);

        complaints.push({
            id: Date.now(),
            customerId: customer.id,
            customerName: customer.name,
            subject: subject,
            description: description,
            status: "Open",
            solution: "",
            date: today()
        });

        saveComplaints(complaints);

        document.getElementById("complaintForm").reset();

        message.style.color = "green";
        message.textContent = "Complaint registered successfully!";

        displayComplaints();
    }

    function displayComplaints() {
        const list = document.getElementById("complaintList");
        if (!list) return;

        const complaints = readData(COMPLAINT_KEY);

        document.getElementById("totalComplaints").textContent =
            complaints.length;

        document.getElementById("openComplaints").textContent =
            complaints.filter(item => item.status === "Open").length;

        document.getElementById("progressComplaints").textContent =
            complaints.filter(item => item.status === "In Progress").length;

        document.getElementById("resolvedComplaints").textContent =
            complaints.filter(item => item.status === "Resolved").length;

        if (complaints.length === 0) {
            list.innerHTML = `
                <tr><td colspan="7">No complaints registered yet.</td></tr>
            `;
            return;
        }

        list.innerHTML = complaints.slice().reverse().map(item => `
            <tr>
                <td>${safe(item.date)}</td>
                <td>${safe(item.customerName)}</td>
                <td>${safe(item.subject)}</td>
                <td>${safe(item.description)}</td>
                <td>
                    <select data-status="${safe(item.id)}">
                        <option value="Open" ${item.status === "Open" ? "selected" : ""}>Open</option>
                        <option value="In Progress" ${item.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Resolved" ${item.status === "Resolved" ? "selected" : ""}>Resolved</option>
                    </select>
                </td>
                <td>
                    <textarea data-solution="${safe(item.id)}"
                        placeholder="Enter solution...">${safe(item.solution)}</textarea>
                </td>
                <td>
                    <button type="button" data-save-complaint="${safe(item.id)}">
                        Save Update
                    </button>
                </td>
            </tr>
        `).join("");
    }

    function handleComplaintAction(event) {
        const button = event.target.closest("[data-save-complaint]");
        if (!button) return;

        const id = button.dataset.saveComplaint;
        const statusSelect = document.querySelector(
            `[data-status="${CSS.escape(id)}"]`
        );
        const solutionField = document.querySelector(
            `[data-solution="${CSS.escape(id)}"]`
        );

        if (!statusSelect || !solutionField) return;

        const complaints = readData(COMPLAINT_KEY);
        const complaint = complaints.find(
            item => String(item.id) === String(id)
        );

        if (!complaint) return;

        complaint.status = statusSelect.value;
        complaint.solution = solutionField.value.trim();
        complaint.updatedDate = today();

        saveComplaints(complaints);
        displayComplaints();

        alert("Complaint updated successfully!");
    }

    document.addEventListener("DOMContentLoaded", createSupportSection);

    console.log("NetBill customer support is ready.");

})();
