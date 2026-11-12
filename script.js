 
// ==========================================
// NETBILL - ISP BILLING & MANAGEMENT SYSTEM
// ==========================================

// LOAD SAVED DATA
let customers = JSON.parse(localStorage.getItem("netbillCustomers") || "[]");
let packages = JSON.parse(localStorage.getItem("netbillPackages") || "[]");
let payments = JSON.parse(localStorage.getItem("netbillPayments") || "[]");
let invoices = JSON.parse(localStorage.getItem("netbillInvoices") || "[]");

// GENERAL FUNCTIONS
function formatMoney(amount) {
    return "Ksh " + Number(amount || 0).toLocaleString("en-KE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function todayString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.getFullYear() === parts[0] &&
        date.getMonth() === parts[1] - 1 &&
        date.getDate() === parts[2];
}

function saveCustomers() {
    localStorage.setItem("netbillCustomers", JSON.stringify(customers));
}

function savePackages() {
    localStorage.setItem("netbillPackages", JSON.stringify(packages));
}

function savePayments() {
    localStorage.setItem("netbillPayments", JSON.stringify(payments));
}

function saveInvoices() {
    localStorage.setItem("netbillInvoices", JSON.stringify(invoices));
}

// CUSTOMER SUBSCRIPTION STATUS
function getCustomerStatus(customer) {
    return customer.expiryDate && customer.expiryDate < todayString()
        ? "Expired"
        : "Active";
}

function updateCustomerStatuses() {
    customers.forEach(customer => {
        customer.status = getCustomerStatus(customer);
    });

    saveCustomers();
}

// PAGE NAVIGATION
document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", function () {
        const page = this.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.style.display = "none";
        });

        const selectedPage = document.getElementById(page);

        if (selectedPage) {
            selectedPage.style.display = "block";
        }

        document.querySelectorAll(".nav-button").forEach(nav => {
            nav.classList.remove("active");
        });

        this.classList.add("active");

        if (page === "dashboard") updateDashboard();
        if (page === "customers") displayCustomers();
        if (page === "packages") displayPackages();
        if (page === "payments") displayPayments();
        if (page === "invoices") displayInvoices();
        if (page === "reports") displayReports();
    });
});

// DASHBOARD
function updateDashboard() {
    updateCustomerStatuses();

    const totalCustomers = document.getElementById("totalCustomers");
    const activeCustomers = document.getElementById("activeCustomers");
    const expiredCustomers = document.getElementById("expiredCustomers");
    const totalRevenue = document.getElementById("totalRevenue");

    if (totalCustomers) totalCustomers.textContent = customers.length;

    if (activeCustomers) {
        activeCustomers.textContent =
            customers.filter(customer => customer.status === "Active").length;
    }

    if (expiredCustomers) {
        expiredCustomers.textContent =
            customers.filter(customer => customer.status === "Expired").length;
    }

    if (totalRevenue) {
        totalRevenue.textContent = formatMoney(
            payments.reduce((total, payment) =>
                total + Number(payment.amount || 0), 0)
        );
    }
}

// ADD CUSTOMER
const customerForm = document.getElementById("customerForm");

if (customerForm) {
    customerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("customerName").value.trim();
        const phone = document.getElementById("customerPhone").value.trim();
        const connectionType = document.getElementById("connectionType").value;
        const packageName = document.getElementById("customerPackage").value;
        const startDate = document.getElementById("customerStartDate").value;
        const expiryDate = document.getElementById("customerExpiryDate").value;
        const message = document.getElementById("customerMessage");

        if (!name || !phone || !startDate || !expiryDate) {
            message.style.color = "red";
            message.textContent = "Please fill in all customer details.";
            return;
        }

        if (expiryDate < startDate) {
            message.style.color = "red";
            message.textContent = "Expiry date cannot be before start date.";
            return;
        }

        const selectedPackage = packages.find(item => item.name === packageName);

        if (!selectedPackage) {
            message.style.color = "red";
            message.textContent = "Please select a valid internet package.";
            return;
        }

        customers.push({
            id: Date.now(),
            name,
            phone,
            connectionType,
            package: packageName,
            startDate,
            expiryDate,
            status: expiryDate < todayString() ? "Expired" : "Active"
        });

        saveCustomers();
        displayCustomers();
        updateDashboard();
        updateCustomerDropdowns();

        customerForm.reset();

        message.style.color = "green";
        message.textContent = "Customer added successfully!";
    });
}

// DISPLAY CUSTOMERS
function displayCustomers() {
    updateCustomerStatuses();

    const customerList = document.getElementById("customerList");
    if (!customerList) return;

    customerList.innerHTML = "";

    if (customers.length === 0) {
        customerList.innerHTML =
            '<tr><td colspan="8">No customers registered yet.</td></tr>';
        return;
    }

    customers.forEach(customer => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(customer.name)}</td>
            <td>${escapeHTML(customer.phone)}</td>
            <td>${escapeHTML(customer.connectionType)}</td>
            <td>${escapeHTML(customer.package)}</td>
            <td>${escapeHTML(customer.startDate || "-")}</td>
            <td>${escapeHTML(customer.expiryDate || "-")}</td>
            <td>${escapeHTML(customer.status)}</td>
            <td>
                <button type="button" data-renew="${customer.id}">
                    Renew Subscription
                </button>
                <button type="button" data-edit="${customer.id}">Edit</button>
                <button type="button" data-delete="${customer.id}">Delete</button>
            </td>
        `;

        customerList.appendChild(row);
    });
}

// EDIT CUSTOMER
function editCustomer(id) {
    const customer = customers.find(
        item => String(item.id) === String(id)
    );

    if (!customer) {
        alert("Customer not found.");
        return;
    }

    const newName = prompt("Edit customer name:", customer.name);
    if (newName === null) return;

    const newPhone = prompt("Edit customer phone number:", customer.phone);
    if (newPhone === null) return;

    const newConnection = prompt(
        "Enter connection type (Hotspot or PPPoE):",
        customer.connectionType
    );
    if (newConnection === null) return;

    const packageChoices = packages.map(item => item.name).join(", ");
    const newPackage = prompt(
        "Enter the package name exactly as shown:\n" + packageChoices,
        customer.package
    );
    if (newPackage === null) return;

    const newStartDate = prompt(
        "Enter start date (YYYY-MM-DD):",
        customer.startDate || todayString()
    );
    if (newStartDate === null) return;

    const newExpiryDate = prompt(
        "Enter expiry date (YYYY-MM-DD):",
        customer.expiryDate || ""
    );
    if (newExpiryDate === null) return;

    if (!newName.trim() || !newPhone.trim()) {
        alert("Customer name and phone number cannot be empty.");
        return;
    }

    const connection = newConnection.trim();

    if (!["Hotspot", "PPPoE"].includes(connection)) {
        alert("Connection type must be Hotspot or PPPoE.");
        return;
    }

    const selectedPackage = packages.find(
        item => item.name === newPackage.trim()
    );

    if (!selectedPackage) {
        alert("Package not found. Please enter an existing package name.");
        return;
    }

    if (!validDate(newStartDate) || !validDate(newExpiryDate)) {
        alert("Please enter valid dates in YYYY-MM-DD format.");
        return;
    }

    if (newExpiryDate < newStartDate) {
        alert("Expiry date cannot be before the start date.");
        return;
    }

    customer.name = newName.trim();
    customer.phone = newPhone.trim();
    customer.connectionType = connection;
    customer.package = selectedPackage.name;
    customer.startDate = newStartDate;
    customer.expiryDate = newExpiryDate;
    customer.status = getCustomerStatus(customer);

    saveCustomers();
    displayCustomers();
    updateDashboard();
    updateCustomerDropdowns();
    displayReports();

    alert("Customer details updated successfully!");
}

// DELETE CUSTOMER
function deleteCustomer(id) {
    const customer = customers.find(
        item => String(item.id) === String(id)
    );

    if (!customer) {
        alert("Customer not found.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete " + customer.name + "?\n\n" +
        "The customer will be removed, but their existing payment and invoice history will be kept."
    );

    if (!confirmed) return;

    customers = customers.filter(
        item => String(item.id) !== String(id)
    );

    saveCustomers();
    displayCustomers();
    updateDashboard();
    updateCustomerDropdowns();
    displayReports();

    alert("Customer deleted successfully. Payment and invoice history has been preserved.");
}

// RENEW CUSTOMER SUBSCRIPTION
function renewCustomerSubscription(id) {
    const customer = customers.find(
        item => String(item.id) === String(id)
    );

    if (!customer) {
        alert("Customer not found.");
        return;
    }

    const newExpiryDate = prompt(
        "Renew subscription for " + customer.name +
        "\nEnter the new expiry date (YYYY-MM-DD):",
        ""
    );

    if (newExpiryDate === null) return;

    if (!validDate(newExpiryDate)) {
        alert("Please enter a valid date in YYYY-MM-DD format.");
        return;
    }

    if (newExpiryDate <= todayString()) {
        alert("The new expiry date must be after today.");
        return;
    }

    if (customer.expiryDate && newExpiryDate <= customer.expiryDate) {
        alert("The new expiry date must be later than the current expiry date.");
        return;
    }

    customer.startDate = todayString();
    customer.expiryDate = newExpiryDate;
    customer.status = "Active";

    saveCustomers();
    displayCustomers();
    updateDashboard();
    updateCustomerDropdowns();

    alert(
        "Subscription renewed successfully!\n\n" +
        "Customer: " + customer.name +
        "\nNew expiry date: " + newExpiryDate +
        "\nStatus: Active"
    );
}

// CUSTOMER ACTION BUTTONS
const customerListElement = document.getElementById("customerList");

if (customerListElement) {
    customerListElement.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.renew) {
            renewCustomerSubscription(button.dataset.renew);
        } else if (button.dataset.edit) {
            editCustomer(button.dataset.edit);
        } else if (button.dataset.delete) {
            deleteCustomer(button.dataset.delete);
        }
    });
}

// ==========================================
// INTERNET PACKAGE MANAGEMENT
// ==========================================

const packageForm = document.getElementById("packageForm");

if (packageForm) {
    packageForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("packageName").value.trim();
        const connection = document.getElementById("packageConnection").value;
        const speed = document.getElementById("packageSpeed").value.trim();
        const price = Number(document.getElementById("packagePrice").value);
        const duration = document.getElementById("packageDuration").value;
        const message = document.getElementById("packageMessage");

        if (!name || !speed || price <= 0 || !duration) {
            message.style.color = "red";
            message.textContent = "Enter valid package details and price.";
            return;
        }

        const duplicate = packages.some(
            item => item.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
            message.style.color = "red";
            message.textContent = "A package with this name already exists.";
            return;
        }

        packages.push({
            id: Date.now(),
            name,
            connection,
            speed,
            price,
            duration
        });

        savePackages();
        displayPackages();
        updateCustomerDropdowns();

        packageForm.reset();

        message.style.color = "green";
        message.textContent = "Internet package added successfully!";
    });
}

// DISPLAY PACKAGES
function displayPackages() {
    const packageList = document.getElementById("packageList");
    if (!packageList) return;

    packageList.innerHTML = "";

    if (packages.length === 0) {
        packageList.innerHTML =
            '<tr><td colspan="6">No internet packages added yet.</td></tr>';
        return;
    }

    packages.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(item.name)}</td>
            <td>${escapeHTML(item.connection)}</td>
            <td>${escapeHTML(item.speed)}</td>
            <td>${formatMoney(item.price)}</td>
            <td>${escapeHTML(item.duration)}</td>
            <td>
                <button type="button" data-package-edit="${item.id}">
                    Edit
                </button>
                <button type="button" data-package-delete="${item.id}">
                    Delete
                </button>
            </td>
        `;

        packageList.appendChild(row);
    });
}

// EDIT PACKAGE
function editPackage(id) {
    const item = packages.find(
        packageItem => String(packageItem.id) === String(id)
    );

    if (!item) {
        alert("Package not found.");
        return;
    }

    const newName = prompt("Edit package name:", item.name);
    if (newName === null) return;

    const newConnection = prompt(
        "Enter connection type (Hotspot or PPPoE):",
        item.connection
    );
    if (newConnection === null) return;

    const newSpeed = prompt("Edit package speed:", item.speed);
    if (newSpeed === null) return;

    const newPriceText = prompt(
        "Edit package price in Ksh:",
        item.price
    );
    if (newPriceText === null) return;

    const newDuration = prompt(
        "Edit package duration:",
        item.duration
    );
    if (newDuration === null) return;

    const cleanName = newName.trim();
    const cleanConnection = newConnection.trim();
    const cleanSpeed = newSpeed.trim();
    const newPrice = Number(newPriceText);

    if (!cleanName || !cleanSpeed || !newDuration.trim() ||
        !Number.isFinite(newPrice) || newPrice <= 0) {
        alert("Please enter valid package details and a price greater than zero.");
        return;
    }

    if (!["Hotspot", "PPPoE"].includes(cleanConnection)) {
        alert("Connection type must be Hotspot or PPPoE.");
        return;
    }

    const duplicate = packages.some(packageItem =>
        String(packageItem.id) !== String(id) &&
        packageItem.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
        alert("Another package already uses this name.");
        return;
    }

    const oldName = item.name;

    item.name = cleanName;
    item.connection = cleanConnection;
    item.speed = cleanSpeed;
    item.price = newPrice;
    item.duration = newDuration.trim();

    customers.forEach(customer => {
        if (customer.package === oldName) {
            customer.package = cleanName;
        }
    });

    savePackages();
    saveCustomers();

    displayPackages();
    displayCustomers();
    updateCustomerDropdowns();
    updateDashboard();
    displayReports();

    alert("Package updated successfully!");
}

// DELETE PACKAGE
function deletePackage(id) {
    const item = packages.find(
        packageItem => String(packageItem.id) === String(id)
    );

    if (!item) {
        alert("Package not found.");
        return;
    }

    const customersUsingPackage = customers.filter(
        customer => customer.package === item.name
    );

    if (customersUsingPackage.length > 0) {
        alert(
            "This package cannot be deleted because " +
            customersUsingPackage.length +
            " customer(s) are currently using it.\n\n" +
            "Change those customers to another package first."
        );
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete the package " +
        item.name + "?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    packages = packages.filter(
        packageItem => String(packageItem.id) !== String(id)
    );

    savePackages();

    displayPackages();
    updateCustomerDropdowns();

    alert("Package deleted successfully!");
}

// PACKAGE ACTION BUTTONS
const packageListElement = document.getElementById("packageList");

if (packageListElement) {
    packageListElement.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.packageEdit) {
            editPackage(button.dataset.packageEdit);
        } else if (button.dataset.packageDelete) {
            deletePackage(button.dataset.packageDelete);
        }
    });
}

// ==========================================
// CUSTOMER DROPDOWNS
// ==========================================

function updateCustomerDropdowns() {
    const packageSelect = document.getElementById("customerPackage");

    if (packageSelect) {
        const selectedValue = packageSelect.value;

        packageSelect.innerHTML =
            '<option value="">Select Package</option>';

        packages.forEach(item => {
            const option = document.createElement("option");
            option.value = item.name;
            option.textContent = item.name + " - " + formatMoney(item.price);
            packageSelect.appendChild(option);
        });

        packageSelect.value = selectedValue;
    }

    ["paymentCustomer", "invoiceCustomer"].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const selectedValue = select.value;

        select.innerHTML =
            '<option value="">Select Customer</option>';

        customers.forEach(customer => {
            const option = document.createElement("option");
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });

        select.value = selectedValue;
    });
}

// ==========================================
// PAYMENT MANAGEMENT
// ==========================================

const paymentForm = document.getElementById("paymentForm");

if (paymentForm) {
    paymentForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const customerId = document.getElementById("paymentCustomer").value;
        const amount = Number(document.getElementById("paymentAmount").value);
        const method = document.getElementById("paymentMethod").value;
        const reference = document.getElementById("paymentReference").value.trim();
        const message = document.getElementById("paymentMessage");

        const customer = customers.find(
            item => String(item.id) === String(customerId)
        );

        if (!customer || amount <= 0) {
            message.style.color = "red";
            message.textContent =
                "Please select a customer and enter a valid amount.";
            return;
        }

        const payment = {
            id: Date.now(),
            customerId: customer.id,
            customerName: customer.name,
            amount,
            method,
            reference,
            date: todayString()
        };

        payments.push(payment);

        const matchingInvoice = invoices.find(invoice =>
            String(invoice.customerId) === String(customer.id) &&
            Number(invoice.amount) === amount &&
            invoice.status === "Unpaid"
        );

        if (matchingInvoice) {
            matchingInvoice.status = "Paid";
            matchingInvoice.paidDate = todayString();
            matchingInvoice.paymentReference = reference;
        }

        savePayments();
        saveInvoices();

        displayPayments();
        displayInvoices();
        updateDashboard();
        displayReports();

        paymentForm.reset();

        message.style.color = "green";
        message.textContent = matchingInvoice
            ? "Payment recorded successfully! Matching invoice marked as Paid."
            : "Payment recorded successfully!";
    });
}

function displayPayments() {
    const paymentList = document.getElementById("paymentList");
    if (!paymentList) return;

    paymentList.innerHTML = "";

    if (payments.length === 0) {
        paymentList.innerHTML =
            '<tr><td colspan="5">No payments recorded yet.</td></tr>';
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(payment.customerName)}</td>
            <td>${formatMoney(payment.amount)}</td>
            <td>${escapeHTML(payment.method)}</td>
            <td>${escapeHTML(payment.reference || "-")}</td>
            <td>${escapeHTML(payment.date)}</td>
        `;

        paymentList.appendChild(row);
    });
}

// ==========================================
// INVOICE MANAGEMENT
// ==========================================

const invoiceForm = document.getElementById("invoiceForm");

if (invoiceForm) {
    invoiceForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const customerId = document.getElementById("invoiceCustomer").value;
        const description =
            document.getElementById("invoiceDescription").value.trim();
        const amount = Number(document.getElementById("invoiceAmount").value);
        const dueDate = document.getElementById("invoiceDueDate").value;
        const message = document.getElementById("invoiceMessage");

        const customer = customers.find(
            item => String(item.id) === String(customerId)
        );

        if (!customer || amount <= 0) {
            message.style.color = "red";
            message.textContent =
                "Please select a customer and enter a valid amount.";
            return;
        }

        const invoice = {
            id: Date.now(),
            invoiceNumber: "INV-" + Date.now(),
            customerId: customer.id,
            customerName: customer.name,
            description,
            amount,
            dueDate,
            date: todayString(),
            status: "Unpaid"
        };

        invoices.push(invoice);

        saveInvoices();
        displayInvoices();
        displayReports();

        invoiceForm.reset();

        message.style.color = "green";
        message.textContent = "Invoice generated successfully!";
    });
}

function displayInvoices() {
    const invoiceList = document.getElementById("invoiceList");
    if (!invoiceList) return;

    invoiceList.innerHTML = "";

    if (invoices.length === 0) {
        invoiceList.innerHTML =
            '<tr><td colspan="7">No invoices generated yet.</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(invoice.invoiceNumber)}</td>
            <td>${escapeHTML(invoice.customerName)}</td>
            <td>${escapeHTML(invoice.description)}</td>
            <td>${formatMoney(invoice.amount)}</td>
            <td>${escapeHTML(invoice.dueDate)}</td>
            <td>${escapeHTML(invoice.status)}</td>
            <td>
                <button type="button" data-print="${invoice.id}">Print</button>
                ${
                    invoice.status === "Unpaid"
                    ? `<button type="button" data-paid="${invoice.id}">Mark Paid</button>`
                    : ""
                }
            </td>
        `;

        invoiceList.appendChild(row);
    });
}

// INVOICE ACTION BUTTONS
const invoiceListElement = document.getElementById("invoiceList");

if (invoiceListElement) {
    invoiceListElement.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button) return;

        if (button.dataset.print) {
            printInvoice(button.dataset.print);
        }

        if (button.dataset.paid) {
            markInvoicePaid(button.dataset.paid);
        }
    });
}

// ==========================================
// PRINT INVOICE WITH COMPANY PROFILE
// ==========================================

function printInvoice(id) {
    const invoice = invoices.find(
        item => String(item.id) === String(id)
    );

    if (!invoice) {
        alert("Invoice not found.");
        return;
    }

    // LOAD COMPANY PROFILE
    let company = {};

    try {
        company = JSON.parse(
            localStorage.getItem("netbillCompanyProfile") || "{}"
        );
    } catch (error) {
        console.error("Could not load company profile:", error);
    }

    const companyName = company.name || "NETBILL";
    const companyPhone = company.phone || "";
    const companyEmail = company.email || "";
    const companyAddress = company.address || "";
    const companyLogo = company.logo || "";

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Please allow pop-ups to print the invoice.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHTML(invoice.invoiceNumber)}</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    color: #222;
                    background: white;
                }

                .invoice {
                    border: 1px solid #ccc;
                    padding: 30px;
                    max-width: 700px;
                    margin: auto;
                }

                .company-header {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    border-bottom: 2px solid #123456;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }

                .company-logo {
                    max-width: 100px;
                    max-height: 100px;
                    object-fit: contain;
                }

                h1 {
                    color: #123456;
                    margin: 0 0 8px;
                }

                h2 {
                    color: #123456;
                    text-align: center;
                    margin-top: 25px;
                }

                .company-details p {
                    margin: 4px 0;
                    font-size: 13px;
                }

                .invoice-details {
                    margin-top: 20px;
                    line-height: 1.8;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 25px;
                }

                td, th {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }

                th {
                    background: #f1f3f5;
                }

                .total {
                    text-align: right;
                    font-size: 20px;
                    margin-top: 25px;
                    font-weight: bold;
                }

                .status {
                    margin-top: 20px;
                    font-weight: bold;
                }

                .footer {
                    border-top: 1px solid #ddd;
                    margin-top: 35px;
                    padding-top: 15px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }

                @media print {
                    body {
                        padding: 0;
                    }

                    .invoice {
                        border: none;
                    }
                }
            </style>
        </head>

        <body>

            <div class="invoice">

                <div class="company-header">

                    ${
                        companyLogo
                        ? `<img class="company-logo" src="${escapeHTML(companyLogo)}" alt="Company Logo">`
                        : ""
                    }

                    <div class="company-details">
                        <h1>${escapeHTML(companyName)}</h1>

                        ${companyPhone
                            ? `<p><strong>Phone:</strong> ${escapeHTML(companyPhone)}</p>`
                            : ""}

                        ${companyEmail
                            ? `<p><strong>Email:</strong> ${escapeHTML(companyEmail)}</p>`
                            : ""}

                        ${companyAddress
                            ? `<p><strong>Address:</strong> ${escapeHTML(companyAddress)}</p>`
                            : ""}
                    </div>

                </div>

                <h2>INVOICE</h2>

                <div class="invoice-details">

                    <p>
                        <strong>Invoice Number:</strong>
                        ${escapeHTML(invoice.invoiceNumber)}
                    </p>

                    <p>
                        <strong>Customer:</strong>
                        ${escapeHTML(invoice.customerName)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${escapeHTML(invoice.date)}
                    </p>

                    <p>
                        <strong>Due Date:</strong>
                        ${escapeHTML(invoice.dueDate)}
                    </p>

                </div>

                <table>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>

                    <tr>
                        <td>${escapeHTML(invoice.description)}</td>
                        <td>${formatMoney(invoice.amount)}</td>
                    </tr>
                </table>

                <div class="total">
                    Total: ${formatMoney(invoice.amount)}
                </div>

                <p class="status">
                    Status: ${escapeHTML(invoice.status)}
                </p>

                <div class="footer">
                    Thank you for choosing ${escapeHTML(companyName)}.
                    <br>
                    Powered by NetBill ISP Management System.
                </div>

            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>

        </body>
        </html>
    `);

    printWindow.document.close();
}

// MARK INVOICE AS PAID
function markInvoicePaid(id) {
    const invoice = invoices.find(
        item => String(item.id) === String(id)
    );

    if (!invoice) return;

    invoice.status = "Paid";
    invoice.paidDate = todayString();

    saveInvoices();
    displayInvoices();
    displayReports();
}

// ==========================================
// REPORTS
// ==========================================

function displayReports() {
    const reports = document.getElementById("reports");
    if (!reports) return;

    const totalRevenue = payments.reduce(
        (total, payment) => total + Number(payment.amount || 0), 0
    );

    const totalInvoiced = invoices.reduce(
        (total, invoice) => total + Number(invoice.amount || 0), 0
    );

    const paidInvoices = invoices.filter(
        invoice => invoice.status === "Paid"
    ).length;

    const unpaidInvoices = invoices.filter(
        invoice => invoice.status === "Unpaid"
    ).length;

    reports.innerHTML = `
        <h2>Reports</h2>

        <div class="report-cards">
            <div class="card">
                <h3>Total Customers</h3>
                <p>${customers.length}</p>
            </div>

            <div class="card">
                <h3>Total Revenue</h3>
                <p>${formatMoney(totalRevenue)}</p>
            </div>

            <div class="card">
                <h3>Total Invoiced</h3>
                <p>${formatMoney(totalInvoiced)}</p>
            </div>

            <div class="card">
                <h3>Paid Invoices</h3>
                <p>${paidInvoices}</p>
            </div>

            <div class="card">
                <h3>Unpaid Invoices</h3>
                <p>${unpaidInvoices}</p>
            </div>
        </div>

        <h3>Payment History</h3>

        <table>
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                </tr>
            </thead>

            <tbody>
                ${
                    payments.length
                    ? payments.map(payment => `
                        <tr>
                            <td>${escapeHTML(payment.customerName)}</td>
                            <td>${formatMoney(payment.amount)}</td>
                            <td>${escapeHTML(payment.method)}</td>
                            <td>${escapeHTML(payment.reference || "-")}</td>
                            <td>${escapeHTML(payment.date)}</td>
                        </tr>
                    `).join("")
                    : '<tr><td colspan="5">No payments recorded yet.</td></tr>'
                }
            </tbody>
        </table>

        <h3>Invoice Summary</h3>

        <table>
            <thead>
                <tr>
                    <th>Invoice Number</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                ${
                    invoices.length
                    ? invoices.map(invoice => `
                        <tr>
                            <td>${escapeHTML(invoice.invoiceNumber)}</td>
                            <td>${escapeHTML(invoice.customerName)}</td>
                            <td>${formatMoney(invoice.amount)}</td>
                            <td>${escapeHTML(invoice.status)}</td>
                        </tr>
                    `).join("")
                    : '<tr><td colspan="4">No invoices generated yet.</td></tr>'
                }
            </tbody>
        </table>
    `;
}

// ==========================================
// START APPLICATION
// ==========================================

updateCustomerStatuses();
updateCustomerDropdowns();
displayCustomers();
displayPackages();
displayPayments();
displayInvoices();
updateDashboard();
displayReports();
