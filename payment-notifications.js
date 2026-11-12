
// ==========================================
// NETBILL - PAYMENT CONFIRMATION NOTIFICATIONS
// ==========================================

const NETBILL_PAYMENT_HISTORY_KEY =
    "netbillPaymentNotificationHistory";

function getPaymentNotificationHistory() {
    return JSON.parse(
        localStorage.getItem(NETBILL_PAYMENT_HISTORY_KEY) || "[]"
    );
}

function savePaymentNotificationHistory(history) {
    localStorage.setItem(
        NETBILL_PAYMENT_HISTORY_KEY,
        JSON.stringify(history)
    );
}

function formatPaymentAmount(amount) {
    return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function createPaymentConfirmation(payment) {
    const customer = customers.find(
        item => String(item.id) === String(payment.customerId)
    );

    const phone = customer ? customer.phone : "";

    const message =
        `Dear ${payment.customerName}, we have successfully received your payment of ${formatPaymentAmount(payment.amount)} via ${payment.method}. Reference: ${payment.reference || "N/A"}. Payment date: ${payment.date}. Thank you for choosing our internet services. - NetBill`;

    return {
        id: payment.id,
        customerName: payment.customerName,
        phone: phone,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        date: payment.date,
        message: message,
        status: "Prepared"
    };
}

function recordPaymentNotification(payment) {
    if (!payment || !payment.id) return;

    const history = getPaymentNotificationHistory();

    const alreadyExists = history.some(
        item => String(item.id) === String(payment.id)
    );

    if (alreadyExists) return;

    const notification = createPaymentConfirmation(payment);

    history.unshift(notification);

    savePaymentNotificationHistory(history);

    displayPaymentNotifications();
}

function displayPaymentNotifications() {
    const paymentsPage = document.getElementById("payments");
    if (!paymentsPage) return;

    let panel = document.getElementById(
        "netbillPaymentNotificationPanel"
    );

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "netbillPaymentNotificationPanel";
        panel.className = "card";
        paymentsPage.appendChild(panel);
    }

    const history = getPaymentNotificationHistory();

    let content = `
        <h3>Payment Confirmation Notifications</h3>
        <p>Prepare payment confirmation messages for your customers.</p>
    `;

    if (history.length === 0) {
        content += `
            <p>No payment confirmation messages yet.</p>
            <p>Messages will appear here when you record customer payments.</p>
        `;
    } else {
        history.forEach((item, index) => {
            content += `
                <div class="card" style="margin-top:12px;">
                    <h4>${item.customerName}</h4>

                    <p>Amount Paid:
                        <strong>${formatPaymentAmount(item.amount)}</strong>
                    </p>

                    <p>Payment Method: ${item.method}</p>
                    <p>Reference: ${item.reference || "N/A"}</p>
                    <p>Payment Date: ${item.date}</p>

                    <textarea
                        id="netbillPaymentMessage${index}"
                        rows="4"
                        style="width:100%; margin:8px 0;"
                        readonly
                    >${item.message}</textarea>

                    <button
                        type="button"
                        data-payment-sms="${index}"
                    >
                        Open SMS App
                    </button>

                    <button
                        type="button"
                        data-payment-whatsapp="${index}"
                    >
                        Send via WhatsApp
                    </button>

                    <button
                        type="button"
                        data-payment-copy="${index}"
                    >
                        Copy Message
                    </button>
                </div>
            `;
        });
    }

    panel.innerHTML = content;

    history.forEach((item, index) => {
        const smsButton = panel.querySelector(
            `[data-payment-sms="${index}"]`
        );

        const whatsappButton = panel.querySelector(
            `[data-payment-whatsapp="${index}"]`
        );

        const copyButton = panel.querySelector(
            `[data-payment-copy="${index}"]`
        );

        if (smsButton) {
            smsButton.addEventListener("click", function () {
                if (!item.phone) {
                    alert("This customer has no phone number.");
                    return;
                }

                window.location.href =
                    "sms:" + item.phone +
                    "?body=" + encodeURIComponent(item.message);
            });
        }

        if (whatsappButton) {
            whatsappButton.addEventListener("click", function () {
                if (!item.phone) {
                    alert("This customer has no phone number.");
                    return;
                }

                let number = String(item.phone).replace(/\D/g, "");

                if (number.startsWith("0")) {
                    number = "254" + number.substring(1);
                } else if (
                    number.startsWith("7") ||
                    number.startsWith("1")
                ) {
                    number = "254" + number;
                }

                if (number.length < 10) {
                    alert("Please check the customer's phone number.");
                    return;
                }

                const url =
                    "https://wa.me/" + number +
                    "?text=" + encodeURIComponent(item.message);

                window.open(url, "_blank");
            });
        }

        if (copyButton) {
            copyButton.addEventListener("click", async function () {
                try {
                    await navigator.clipboard.writeText(item.message);
                    alert("Payment confirmation copied successfully!");
                } catch (error) {
                    const textarea = document.getElementById(
                        `netbillPaymentMessage${index}`
                    );

                    textarea.focus();
                    textarea.select();

                    alert("Select and copy the message manually.");
                }
            });
        }
    });
}

// Connect to the existing payment-saving function.
if (typeof savePayments === "function") {
    const originalNetBillSavePayments = savePayments;

    savePayments = function () {
        originalNetBillSavePayments();

        if (Array.isArray(payments) && payments.length > 0) {
            const latestPayment = payments[payments.length - 1];
            recordPaymentNotification(latestPayment);
        }
    };
}

displayPaymentNotifications();

console.log(
    "NetBill payment confirmation notifications loaded successfully."
);
