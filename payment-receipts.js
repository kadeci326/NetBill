 
 // ==========================================
 // NETBILL - PAYMENT RECEIPTS WITH COMPANY PROFILE
 // ==========================================

(function () {
    "use strict";

    function escapeText(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function money(amount) {
        return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function addReceiptButtons() {
        const paymentList = document.getElementById("paymentList");
        if (!paymentList) return;

        const rows = paymentList.querySelectorAll("tr");

        rows.forEach((row, index) => {
            if (row.querySelector("[data-print-receipt]")) return;

            const payments = JSON.parse(
                localStorage.getItem("netbillPayments") || "[]"
            );

            const payment = payments[index];
            if (!payment) return;

            const actionCell = document.createElement("td");

            actionCell.innerHTML = `
                <button type="button"
                    data-print-receipt="${escapeText(payment.id)}"
                    style="background:#198754;color:white;border:0;
                    padding:8px 12px;border-radius:5px;cursor:pointer;">
                    Print Receipt
                </button>
            `;

            row.appendChild(actionCell);
        });
    }

    function printPaymentReceipt(paymentId) {
        const payments = JSON.parse(
            localStorage.getItem("netbillPayments") || "[]"
        );

        const customers = JSON.parse(
            localStorage.getItem("netbillCustomers") || "[]"
        );

        const profile = JSON.parse(
            localStorage.getItem("netbillCompanyProfile") || "{}"
        );

        const payment = payments.find(
            item => String(item.id) === String(paymentId)
        );

        if (!payment) {
            alert("Payment record not found.");
            return;
        }

        const customer = customers.find(
            item => String(item.id) === String(payment.customerId)
        );

        const companyName = profile.companyName || "NETBILL INTERNET SERVICES";
        const companyPhone = profile.phone || "";
        const companyEmail = profile.email || "";
        const companyAddress = profile.address || "";

        const logo = profile.logo
            ? `<img src="${profile.logo}" style="max-width:130px;max-height:90px;object-fit:contain;">`
            : "";

        const receiptNumber = "RCT-" + payment.id;
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert("Please allow pop-ups to print receipts.");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeText(receiptNumber)}</title>
                <style>
                    body { font-family:Arial,sans-serif;padding:30px;color:#222; }
                    .receipt { max-width:550px;margin:auto;border:1px solid #ddd;padding:30px;border-radius:8px; }
                    .center { text-align:center; }
                    h1 { color:#123b68;margin-bottom:5px; }
                    table { width:100%;border-collapse:collapse;margin-top:20px; }
                    td { padding:12px 5px;border-bottom:1px solid #ddd; }
                    .total { font-size:20px;font-weight:bold;color:#198754; }
                    .footer { text-align:center;margin-top:30px;font-size:13px; }
                    @media print { body { padding:0; } .receipt { border:none; } }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="center">${logo}</div>
                    <h1 class="center">${escapeText(companyName)}</h1>

                    <p class="center">
                        ${escapeText(companyAddress)}<br>
                        ${escapeText(companyPhone)}<br>
                        ${escapeText(companyEmail)}
                    </p>

                    <h2 class="center">PAYMENT RECEIPT</h2>
                    <p class="center">Receipt Number: ${escapeText(receiptNumber)}</p>
                    <hr>

                    <p><strong>Customer:</strong> ${escapeText(payment.customerName)}</p>
                    <p><strong>Phone:</strong> ${escapeText(customer?.phone || "Not available")}</p>
                    <p><strong>Date:</strong> ${escapeText(payment.date)}</p>

                    <table>
                        <tr><td>Payment Method</td><td>${escapeText(payment.method)}</td></tr>
                        <tr><td>Transaction Reference</td><td>${escapeText(payment.reference || "N/A")}</td></tr>
                        <tr><td class="total">Amount Paid</td><td class="total">${money(payment.amount)}</td></tr>
                    </table>

                    <h3 class="center">PAYMENT RECEIVED SUCCESSFULLY</h3>

                    <div class="footer">
                        Thank you for choosing our internet services!<br><br>
                        Powered by NetBill ISP Management System
                    </div>
                </div>

                <script>
                    window.onload = function () { window.print(); };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    function connectReceipts() {
        if (typeof window.displayPayments === "function") {
            const originalDisplayPayments = window.displayPayments;

            window.displayPayments = function () {
                originalDisplayPayments();
                addReceiptButtons();
            };
        }

        addReceiptButtons();
    }

    document.addEventListener("click", function (event) {
        const button = event.target.closest("[data-print-receipt]");
        if (button) {
            printPaymentReceipt(button.dataset.printReceipt);
        }
    });

    connectReceipts();

})();
