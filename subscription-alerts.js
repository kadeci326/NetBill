
document.addEventListener("DOMContentLoaded", function () {
    const dashboard = document.getElementById("dashboard");

    if (!dashboard) return;

    function displaySubscriptionAlerts() {
        const customers = JSON.parse(
            localStorage.getItem("netbillCustomers") || "[]"
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alerts = customers.filter(customer => {
            if (!customer.expiryDate) return false;

            const expiry = new Date(customer.expiryDate + "T00:00:00");
            const daysRemaining = Math.round(
                (expiry - today) / (1000 * 60 * 60 * 24)
            );

            return daysRemaining <= 3;
        });

        let alertBox = document.getElementById("subscriptionAlerts");

        if (!alertBox) {
            alertBox = document.createElement("div");
            alertBox.id = "subscriptionAlerts";
            dashboard.appendChild(alertBox);
        }

        alertBox.innerHTML = `
            <h2>Subscription Expiry Alerts</h2>
            ${
                alerts.length === 0
                ? "<p>All customer subscriptions are up to date.</p>"
                : alerts.map(customer => {
                    const expiry = new Date(
                        customer.expiryDate + "T00:00:00"
                    );

                    const days = Math.round(
                        (expiry - today) / (1000 * 60 * 60 * 24)
                    );

                    const expired = days < 0;

                    return `
                        <div style="
                            padding: 12px;
                            margin: 10px 0;
                            border-radius: 6px;
                            background: ${expired ? "#ffe5e5" : "#fff3cd"};
                            color: #222;
                        ">
                            <strong>${customer.name.replace(/[&<>"']/g, c => ({
                                "&": "&amp;",
                                "<": "&lt;",
                                ">": "&gt;",
                                '"': "&quot;",
                                "'": "&#039;"
                            })[c])}</strong>
                            <br>
                            Phone: ${customer.phone}
                            <br>
                            Expiry: ${customer.expiryDate}
                            <br>
                            <strong>
                                ${expired
                                    ? "EXPIRED"
                                    : days === 0
                                        ? "EXPIRES TODAY"
                                        : "EXPIRES IN " + days + " DAYS"
                                }
                            </strong>
                        </div>
                    `;
                }).join("")
            }
        `;
    }

    displaySubscriptionAlerts();

    document.querySelectorAll(".nav-button").forEach(button => {
        button.addEventListener("click", function () {
            if (this.dataset.page === "dashboard") {
                displaySubscriptionAlerts();
            }
        });
    });

    window.addEventListener("storage", displaySubscriptionAlerts);
});
