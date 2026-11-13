 
// ==========================================
// NETBILL - AUTOMATIC PAYMENT SMS NOTIFICATIONS
// ==========================================

const NETBILL_PAYMENT_HISTORY_KEY =
    "netbillPaymentNotificationHistory";

function getPaymentNotificationHistory() {
    try {
        const history = JSON.parse(
            localStorage.getItem(NETBILL_PAYMENT_HISTORY_KEY) || "[]"
        );

        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error("Could not load SMS history:", error);
        return [];
    }
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

function escapePaymentHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Convert Kenyan phone numbers into 254 format.
function normalizePaymentPhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "254" + number.substring(1);
    } else if (number.startsWith("7") || number.startsWith("1")) {
        number = "254" + number;
    }

    if (!/^254[17]\d{8}$/.test(number)) {
        return null;
    }

    return number;
}

// CREATE PAYMENT CONFIRMATION
function createPaymentConfirmation(payment) {
    const customer = customers.find(
        item => String(item.id) === String(payment.customerId)
    );

    const phone = customer ? customer.phone : "";

    const packageName = customer
        ? customer.package
        : "Internet Package";

    const message =
        `Dear ${payment.customerName}, we have received your payment of ` +
        `${formatPaymentAmount(payment.amount)} for ${packageName}. ` +
        `Payment method: ${payment.method}. ` +
        `Reference: ${payment.reference || "N/A"}. ` +
        `Date: ${payment.date}. Thank you for choosing NetBill Internet Services.`;

    return {
        id: payment.id,
        customerId: payment.customerId,
        customerName: payment.customerName,
        phone: phone,
        packageName: packageName,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        date: payment.date,
        message: message,
        status: "Prepared",
        messageId: "",
        error: ""
    };
}

// SAVE A NEW PAYMENT NOTIFICATION
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

    // Automatically send the SMS.
    sendPaymentConfirmationSMS(notification.id);
}

// UPDATE NOTIFICATION STATUS
function updatePaymentNotification(id, updates) {
    const history = getPaymentNotificationHistory();

    const notification = history.find(
        item => String(item.id) === String(id)
    );

    if (!notification) return null;

    Object.assign(notification, updates);

    savePaymentNotificationHistory(history);

    displayPaymentNotifications();

    return notification;
}

// SEND SMS THROUGH SUPABASE EDGE FUNCTION
async function sendPaymentConfirmationSMS(id) {
    const history = getPaymentNotificationHistory();

    const notification = history.find(
        item => String(item.id) === String(id)
    );

    if (!notification) return;

    // Prevent duplicate or simultaneous sends.
    if (
        notification.status === "Sending" ||
        notification.status === "Accepted"
    ) {
        return;
    }

    const phone = normalizePaymentPhone(notification.phone);

    if (!phone) {
        updatePaymentNotification(id, {
            status: "Failed",
            error: "Invalid or missing customer phone number."
        });

        return;
    }

    const supabaseClient = window.netbillSupabase;

    if (!supabaseClient || !supabaseClient.functions) {
        updatePaymentNotification(id, {
            status: "Failed",
            error: "Supabase connection is not available."
        });

        return;
    }

    updatePaymentNotification(id, {
        status: "Sending",
        error: ""
    });

    try {
        const { data, error } =
            await supabaseClient.functions.invoke(
                "send-flexcom-sms",
                {
                    body: {
                        phone: phone,
                        message: notification.message
                    }
                }
            );

        if (error) {
            throw new Error(error.message || "SMS request failed.");
        }

        if (!data || data.success !== true) {
            const errorMessage =
                data?.result?.message ||
                data?.error ||
                "Mobile Sasa did not accept the SMS.";

            throw new Error(errorMessage);
        }

        updatePaymentNotification(id, {
            status: "Accepted",
            messageId: data.result?.messageId || "",
            error: ""
        });

        console.log(
            "Payment SMS accepted:",
            notification.customerName
        );

    } catch (error) {
        console.error("Payment SMS failed:", error);

        updatePaymentNotification(id, {
            status: "Failed",
            error: error.message || "SMS sending failed."
        });
    }
}

// DISPLAY PAYMENT NOTIFICATIONS
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
        <h3>Automatic Payment SMS Notifications</h3>

        <p>
            Customers receive payment confirmation SMS messages
            automatically when payments are recorded.
        </p>
    `;

    if (history.length === 0) {
        content += `
            <p>No payment confirmation messages yet.</p>
        `;
    } else {
        history.forEach((item, index) => {
            const statusColor =
                item.status === "Accepted" ? "green" :
                item.status === "Failed" ? "red" :
                item.status === "Sending" ? "#b7791f" : "#555";

            content += `
                <div class="card" style="margin-top:12px;">

                    <h4>${escapePaymentHTML(item.customerName)}</h4>

                    <p>
                        Phone:
                        <strong>${escapePaymentHTML(item.phone)}</strong>
                    </p>

                    <p>
                        Amount Paid:
                        <strong>${formatPaymentAmount(item.amount)}</strong>
                    </p>

                    <p>
                        Package:
                        ${escapePaymentHTML(item.packageName || "-")}
                    </p>

                    <p>
                        Payment Method:
                        ${escapePaymentHTML(item.method)}
                    </p>

                    <p>
                        Reference:
                        ${escapePaymentHTML(item.reference || "N/A")}
                    </p>

                    <p>
                        SMS Status:
                        <strong style="color:${statusColor}">
                            ${escapePaymentHTML(item.status)}
                        </strong>
                    </p>

                    ${
                        item.error
                        ? `<p style="color:red;">
                            ${escapePaymentHTML(item.error)}
                           </p>`
                        : ""
                    }

                    <textarea
                        id="netbillPaymentMessage${index}"
                        rows="4"
                        style="width:100%; margin:8px 0;"
                        readonly
                    >${escapePaymentHTML(item.message)}</textarea>

                    ${
                        item.status === "Failed"
                        ? `<button
                            type="button"
                            data-payment-retry="${escapePaymentHTML(item.id)}"
                           >
                            Retry SMS
                           </button>`
                        : ""
                    }

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
                const number = normalizePaymentPhone(item.phone);

                if (!number) {
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

    panel.querySelectorAll("[data-payment-retry]").forEach(button => {
        button.addEventListener("click", function () {
            sendPaymentConfirmationSMS(
                this.dataset.paymentRetry
            );
        });
    });
}

// CONNECT TO THE EXISTING PAYMENT FORM
function connectAutomaticPaymentSMS() {
    const paymentForm = document.getElementById("paymentForm");

    if (!paymentForm || paymentForm.dataset.smsConnected === "true") {
        return;
    }

    paymentForm.dataset.smsConnected = "true";

    // The original payment handler runs first.
    paymentForm.addEventListener("submit", function () {
        setTimeout(function () {
            const messageElement =
                document.getElementById("paymentMessage");

            if (
                !messageElement ||
                !messageElement.textContent.startsWith(
                    "Payment recorded successfully!"
                )
            ) {
                return;
            }

            if (!Array.isArray(payments) || payments.length === 0) {
                return;
            }

            const latestPayment = payments[payments.length - 1];

            recordPaymentNotification(latestPayment);

        }, 0);
    });
}

// START
connectAutomaticPaymentSMS();
displayPaymentNotifications();

console.log(
    "NetBill automatic payment SMS notifications loaded successfully."
);
