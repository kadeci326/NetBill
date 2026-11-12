 
// ==========================================
// NETBILL - SMS AND WHATSAPP NOTIFICATIONS
// ==========================================

function getNetBillCustomers() {
    return JSON.parse(localStorage.getItem("netbillCustomers") || "[]");
}

function getCustomerExpiry(customer) {
    return customer.expiryDate ||
        customer.customerExpiryDate ||
        customer.subscriptionExpiry ||
        "";
}

function getCustomerName(customer) {
    return customer.name || customer.customerName || "Customer";
}

function getCustomerPhone(customer) {
    return customer.phone || customer.customerPhone || "";
}

function getExpiryMessage(customer, status) {
    const name = getCustomerName(customer);
    const expiry = getCustomerExpiry(customer);

    if (status === "Expired") {
        return `Dear ${name}, your internet subscription expired on ${expiry}. Please renew your subscription to continue enjoying our internet services. Thank you. - NetBill`;
    }

    return `Dear ${name}, your internet subscription expires on ${expiry}. Please renew early to avoid interruption of your internet services. Thank you. - NetBill`;
}

function getSubscriptionNotifications() {
    const customers = getNetBillCustomers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const notifications = [];

    customers.forEach(customer => {
        const expiry = getCustomerExpiry(customer);
        if (!expiry) return;

        const expiryDate = new Date(expiry);
        if (isNaN(expiryDate.getTime())) return;

        expiryDate.setHours(0, 0, 0, 0);

        const daysLeft = Math.round(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        if (daysLeft < 0) {
            notifications.push({
                customer,
                status: "Expired"
            });
        } else if (daysLeft <= 3) {
            notifications.push({
                customer,
                status: "Expiring Soon"
            });
        }
    });

    return notifications;
}

function saveNetBillNotification(customer, method, message) {
    const history = JSON.parse(
        localStorage.getItem("netbillNotificationHistory") || "[]"
    );

    history.unshift({
        customer: getCustomerName(customer),
        phone: getCustomerPhone(customer),
        method,
        message,
        date: new Date().toLocaleString()
    });

    localStorage.setItem(
        "netbillNotificationHistory",
        JSON.stringify(history)
    );
}

function getWhatsAppNumber(phone) {
    let number = String(phone).replace(/\D/g, "");

    if (number.startsWith("0")) {
        number = "254" + number.substring(1);
    }

    if (number.startsWith("7") || number.startsWith("1")) {
        number = "254" + number;
    }

    return number;
}

function displaySMSNotifications() {
    const dashboard = document.getElementById("dashboard");
    if (!dashboard) return;

    let panel = document.getElementById("netbillSMSPanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "netbillSMSPanel";
        panel.className = "card";
        dashboard.appendChild(panel);
    }

    const notifications = getSubscriptionNotifications();

    let content = `
        <h3>SMS Notification Centre</h3>
        <p>Contact customers whose subscriptions are expiring soon or have expired.</p>
    `;

    if (notifications.length === 0) {
        content += `
            <p>No customers currently require subscription notifications.</p>
        `;
    } else {
        notifications.forEach((item, index) => {
            const customer = item.customer;
            const name = getCustomerName(customer);
            const phone = getCustomerPhone(customer);
            const message = getExpiryMessage(customer, item.status);

            content += `
                <div class="card" style="margin-top:12px;">
                    <h4>${name}</h4>
                    <p>Phone: ${phone || "No phone number"}</p>
                    <p>Status: <strong>${item.status}</strong></p>
                    <p>Expiry Date: ${getCustomerExpiry(customer)}</p>

                    <textarea
                        id="netbillSMSMessage${index}"
                        rows="3"
                        style="width:100%; margin:8px 0;"
                        readonly
                    >${message}</textarea>

                    <button type="button" data-sms-send="${index}">
                        Open SMS App
                    </button>

                    <button type="button" data-whatsapp-send="${index}">
                        Send via WhatsApp
                    </button>

                    <button type="button" data-sms-copy="${index}">
                        Copy Message
                    </button>
                </div>
            `;
        });
    }

    content += `
        <h3 style="margin-top:25px;">Notification History</h3>
        <div id="netbillNotificationHistory"></div>
    `;

    panel.innerHTML = content;

    notifications.forEach((item, index) => {
        const customer = item.customer;
        const message = getExpiryMessage(customer, item.status);
        const phone = getCustomerPhone(customer);

        panel.querySelector(`[data-sms-send="${index}"]`)
            .addEventListener("click", function () {
                if (!phone) {
                    alert("This customer has no phone number.");
                    return;
                }

                saveNetBillNotification(customer, "SMS prepared", message);

                window.location.href =
                    "sms:" + phone + "?body=" + encodeURIComponent(message);
                
                displayNotificationHistory();
            });

        panel.querySelector(`[data-whatsapp-send="${index}"]`)
            .addEventListener("click", function () {
                if (!phone) {
                    alert("This customer has no phone number.");
                    return;
                }

                const number = getWhatsAppNumber(phone);

                if (number.length < 10) {
                    alert("Please check this customer's phone number.");
                    return;
                }

                saveNetBillNotification(customer, "WhatsApp prepared", message);

                const url =
                    "https://wa.me/" + number +
                    "?text=" + encodeURIComponent(message);

                window.open(url, "_blank");

                displayNotificationHistory();
            });

        panel.querySelector(`[data-sms-copy="${index}"]`)
            .addEventListener("click", async function () {
                try {
                    await navigator.clipboard.writeText(message);
                    saveNetBillNotification(customer, "Message copied", message);
                    alert("Message copied successfully!");
                    displayNotificationHistory();
                } catch (error) {
                    alert("Please select and copy the message manually.");
                }
            });
    });

    displayNotificationHistory();
}

function displayNotificationHistory() {
    const container = document.getElementById(
        "netbillNotificationHistory"
    );

    if (!container) return;

    const history = JSON.parse(
        localStorage.getItem("netbillNotificationHistory") || "[]"
    );

    if (history.length === 0) {
        container.innerHTML = "<p>No notification history yet.</p>";
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="card" style="margin-top:8px;">
            <strong>${item.customer}</strong>
            <p>Phone: ${item.phone || "Not provided"}</p>
            <p>Method: ${item.method}</p>
            <p>Date: ${item.date}</p>
        </div>
    `).join("");
}

document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", function () {
        if (this.dataset.page === "dashboard") {
            displaySMSNotifications();
        }
    });
});

displaySMSNotifications();

console.log("NetBill SMS and WhatsApp notification system loaded successfully.");
