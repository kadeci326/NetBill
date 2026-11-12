
// ==========================================
// NETBILL - PROFESSIONAL DASHBOARD ANALYTICS
// ==========================================

(function () {
    "use strict";

    function readData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Could not read " + key, error);
            return [];
        }
    }

    function money(amount) {
        return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function safe(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function getMonthKey(dateString) {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}/.test(String(dateString))) {
            return null;
        }

        return String(dateString).slice(0, 7);
    }

    function getLastSixMonths() {
        const months = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

            const key =
                date.getFullYear() + "-" +
                String(date.getMonth() + 1).padStart(2, "0");

            months.push({
                key,
                label: date.toLocaleDateString("en-KE", {
                    month: "short"
                })
            });
        }

        return months;
    }

    function getDashboardData() {
        const customers = readData("netbillCustomers");
        const payments = readData("netbillPayments");
        const invoices = readData("netbillInvoices");

        const today = new Date();
        const todayKey =
            today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");

        const activeCustomers = customers.filter(customer =>
            !customer.expiryDate || customer.expiryDate >= todayKey
        );

        const expiredCustomers = customers.filter(customer =>
            customer.expiryDate && customer.expiryDate < todayKey
        );

        const totalRevenue = payments.reduce(
            (sum, payment) => sum + Number(payment.amount || 0), 0
        );

        const unpaidInvoices = invoices.filter(invoice =>
            String(invoice.status || "").toLowerCase() !== "paid"
        );

        const outstandingAmount = unpaidInvoices.reduce(
            (sum, invoice) => sum + Number(invoice.amount || 0), 0
        );

        return {
            customers,
            payments,
            invoices,
            activeCustomers,
            expiredCustomers,
            totalRevenue,
            unpaidInvoices,
            outstandingAmount
        };
    }

    function createAnalyticsLayout() {
        const dashboard = document.getElementById("dashboard");

        if (!dashboard) return null;

        let container = document.getElementById("netbillAnalytics");

        if (container) return container;

        container = document.createElement("div");
        container.id = "netbillAnalytics";

        const summaryCards = dashboard.querySelector(".dashboard-cards");

        if (summaryCards) {
            summaryCards.insertAdjacentElement("afterend", container);
        } else {
            dashboard.appendChild(container);
        }

        return container;
    }

    function renderRevenueChart(payments) {
        const months = getLastSixMonths();

        const totals = months.map(month => {
            return payments
                .filter(payment => getMonthKey(payment.date) === month.key)
                .reduce((sum, payment) =>
                    sum + Number(payment.amount || 0), 0
                );
        });

        const maximum = Math.max(...totals, 1);

        return `
            <div class="nb-chart-card">
                <div class="nb-chart-heading">
                    <div>
                        <h3>Revenue Overview</h3>
                        <p>Payment collections over the last six months</p>
                    </div>
                    <span class="nb-chart-tag">6 MONTHS</span>
                </div>

                <div class="nb-bar-chart">
                    ${months.map((month, index) => {
                        const height = totals[index] > 0
                            ? Math.max((totals[index] / maximum) * 100, 5)
                            : 3;

                        return `
                            <div class="nb-bar-column">
                                <div class="nb-bar-value">
                                    ${totals[index] > 0
                                        ? money(totals[index])
                                        : "—"}
                                </div>
                                <div class="nb-bar-track">
                                    <div class="nb-bar-fill"
                                         style="height:${height}%"></div>
                                </div>
                                <span>${safe(month.label)}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function renderCustomerGrowth(customers) {
        const months = getLastSixMonths();

        const totals = months.map(month =>
            customers.filter(customer =>
                getMonthKey(customer.startDate) === month.key
            ).length
        );

        const maximum = Math.max(...totals, 1);

        return `
            <div class="nb-chart-card">
                <div class="nb-chart-heading">
                    <div>
                        <h3>Customer Growth</h3>
                        <p>New customer registrations by month</p>
                    </div>
                    <span class="nb-chart-tag">6 MONTHS</span>
                </div>

                <div class="nb-bar-chart nb-growth-chart">
                    ${months.map((month, index) => {
                        const height = totals[index] > 0
                            ? Math.max((totals[index] / maximum) * 100, 5)
                            : 3;

                        return `
                            <div class="nb-bar-column">
                                <div class="nb-bar-value">
                                    ${totals[index]}
                                </div>
                                <div class="nb-bar-track">
                                    <div class="nb-bar-fill nb-growth-fill"
                                         style="height:${height}%"></div>
                                </div>
                                <span>${safe(month.label)}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function renderSubscriptionStatus(data) {
        const total = data.customers.length;

        const activePercent = total
            ? (data.activeCustomers.length / total) * 100
            : 0;

        const expiredPercent = total
            ? (data.expiredCustomers.length / total) * 100
            : 0;

        return `
            <div class="nb-panel">
                <h3>Subscription Overview</h3>
                <p class="nb-panel-subtitle">Current customer status</p>

                <div class="nb-status-total">${total}</div>
                <p class="nb-status-caption">Total registered customers</p>

                <div class="nb-status-line">
                    <span>Active subscriptions</span>
                    <strong>${data.activeCustomers.length}</strong>
                </div>

                <div class="nb-progress">
                    <div class="nb-progress-active"
                         style="width:${activePercent}%"></div>
                </div>

                <div class="nb-status-line">
                    <span>Expired subscriptions</span>
                    <strong>${data.expiredCustomers.length}</strong>
                </div>

                <div class="nb-progress">
                    <div class="nb-progress-expired"
                         style="width:${expiredPercent}%"></div>
                </div>
            </div>
        `;
    }

    function renderOutstandingInvoices(data) {
        return `
            <div class="nb-panel">
                <h3>Outstanding Invoices</h3>
                <p class="nb-panel-subtitle">Invoices not yet marked as paid</p>

                <div class="nb-outstanding-amount">
                    ${money(data.outstandingAmount)}
                </div>

                <div class="nb-outstanding-bottom">
                    <span>${data.unpaidInvoices.length} unpaid invoice(s)</span>
                    <button type="button" class="nb-small-action"
                            data-go-page="invoices">
                        View invoices
                    </button>
                </div>
            </div>
        `;
    }

    function renderRecentPayments(payments) {
        const recent = [...payments]
            .sort((a, b) => {
                const dateA = String(a.date || "");
                const dateB = String(b.date || "");

                return dateB.localeCompare(dateA) ||
                    Number(b.id || 0) - Number(a.id || 0);
            })
            .slice(0, 5);

        return `
            <div class="nb-panel nb-recent-panel">
                <div class="nb-panel-heading">
                    <div>
                        <h3>Recent Payments</h3>
                        <p class="nb-panel-subtitle">Latest recorded transactions</p>
                    </div>
                    <button type="button" class="nb-small-action"
                            data-go-page="payments">
                        View all
                    </button>
                </div>

                <div class="nb-recent-list">
                    ${recent.length ? recent.map(payment => `
                        <div class="nb-payment-row">
                            <div class="nb-payment-icon">KSh</div>
                            <div class="nb-payment-info">
                                <strong>${safe(payment.customerName || "Customer")}</strong>
                                <span>
                                    ${safe(payment.method || "Payment")}
                                    · ${safe(payment.date || "-")}
                                </span>
                            </div>
                            <strong class="nb-payment-amount">
                                ${money(payment.amount)}
                            </strong>
                        </div>
                    `).join("") : `
                        <p class="nb-empty-message">No payments recorded yet.</p>
                    `}
                </div>
            </div>
        `;
    }

    function renderQuickActions() {
        return `
            <div class="nb-quick-actions">
                <div>
                    <h3>Quick Actions</h3>
                    <p>Manage your ISP operations faster</p>
                </div>

                <div class="nb-action-buttons">
                    <button type="button" data-go-page="customers">
                        + Add Customer
                    </button>

                    <button type="button" data-go-page="payments">
                        + Record Payment
                    </button>

                    <button type="button" data-go-page="invoices">
                        + Generate Invoice
                    </button>

                    <button type="button" data-go-page="packages">
                        + Add Package
                    </button>
                </div>
            </div>
        `;
    }

    function renderAnalytics() {
        const container = createAnalyticsLayout();
        if (!container) return;

        const data = getDashboardData();

        container.innerHTML = `
            <div class="nb-welcome">
                <div>
                    <span class="nb-eyebrow">BUSINESS OVERVIEW</span>
                    <h2>Welcome to NetBill</h2>
                    <p>Here is how your internet business is performing.</p>
                </div>
                <div class="nb-today">
                    ${new Date().toLocaleDateString("en-KE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    })}
                </div>
            </div>

            <div class="nb-insight-grid">
                <div class="nb-insight-card">
                    <span>Total Payments</span>
                    <strong>${data.payments.length}</strong>
                    <small>Recorded transactions</small>
                </div>

                <div class="nb-insight-card">
                    <span>Revenue Collected</span>
                    <strong>${money(data.totalRevenue)}</strong>
                    <small>All recorded payments</small>
                </div>

                <div class="nb-insight-card">
                    <span>Outstanding Invoices</span>
                    <strong>${money(data.outstandingAmount)}</strong>
                    <small>${data.unpaidInvoices.length} unpaid invoice(s)</small>
                </div>
            </div>

            <div class="nb-chart-grid">
                ${renderRevenueChart(data.payments)}
                ${renderCustomerGrowth(data.customers)}
            </div>

            <div class="nb-detail-grid">
                ${renderSubscriptionStatus(data)}
                ${renderOutstandingInvoices(data)}
            </div>

            ${renderRecentPayments(data.payments)}

            ${renderQuickActions()}
        `;
    }

    function connectDashboard() {
        const originalUpdateDashboard = window.updateDashboard;

        if (typeof originalUpdateDashboard === "function") {
            window.updateDashboard = function (...args) {
                const result = originalUpdateDashboard.apply(this, args);
                renderAnalytics();
                return result;
            };
        }

        const dashboard = document.getElementById("dashboard");

        if (dashboard) {
            dashboard.addEventListener("click", function (event) {
                const button = event.target.closest("[data-go-page]");
                if (!button) return;

                const page = button.dataset.goPage;

                const navigationButton = document.querySelector(
                    '.nav-button[data-page="' + page + '"]'
                );

                if (navigationButton) {
                    navigationButton.click();
                }
            });
        }

        renderAnalytics();
    }

    connectDashboard();

})();
