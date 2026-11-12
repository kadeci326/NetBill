
// ==========================================
// NETBILL - COMPANY PROFILE & SETTINGS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const STORAGE_KEY = "netbillCompanyProfile";

    const settingsSection = document.getElementById("settings");

    if (!settingsSection) {
        alert("Settings section was not found. Please check index.html.");
        return;
    }

    const oldProfile = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
    );

    const panel = document.createElement("div");

    panel.id = "netbillCompanyProfilePanel";

    panel.style.cssText = `
        background: white;
        padding: 25px;
        margin: 20px 0;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 750px;
    `;

    panel.innerHTML = `
        <h2>Company Profile</h2>
        <p>Enter your internet business details below.</p>

        <form id="companyProfileForm">

            <label>Company Name</label>
            <input type="text" id="profileCompanyName"
                placeholder="Enter company name" required>

            <label>Business Phone Number</label>
            <input type="tel" id="profilePhone"
                placeholder="e.g. 0712345678">

            <label>Business Email</label>
            <input type="email" id="profileEmail"
                placeholder="Enter business email">

            <label>Physical Address</label>
            <textarea id="profileAddress"
                placeholder="Enter business address"
                rows="3"></textarea>

            <label>Company Logo</label>
            <input type="file" id="profileLogo"
                accept="image/*">

            <div style="margin:15px 0;">
                <img id="profileLogoPreview"
                    alt="Company logo preview"
                    style="max-width:140px;max-height:100px;display:none;">
            </div>

            <button type="submit"
                style="
                    background:#198754;
                    color:white;
                    border:none;
                    padding:12px 20px;
                    border-radius:6px;
                    cursor:pointer;
                ">
                SAVE COMPANY PROFILE
            </button>

            <p id="companyProfileMessage"
                style="margin-top:15px;font-weight:bold;">
            </p>

        </form>
    `;

    settingsSection.appendChild(panel);

    const companyName = document.getElementById("profileCompanyName");
    const phone = document.getElementById("profilePhone");
    const email = document.getElementById("profileEmail");
    const address = document.getElementById("profileAddress");
    const logoInput = document.getElementById("profileLogo");
    const logoPreview = document.getElementById("profileLogoPreview");
    const message = document.getElementById("companyProfileMessage");
    const form = document.getElementById("companyProfileForm");

    let companyLogo = oldProfile.logo || "";

    // LOAD EXISTING COMPANY DETAILS
    companyName.value = oldProfile.companyName || "";
    phone.value = oldProfile.phone || "";
    email.value = oldProfile.email || "";
    address.value = oldProfile.address || "";

    if (companyLogo) {
        logoPreview.src = companyLogo;
        logoPreview.style.display = "block";
    }

    // PREVIEW SELECTED LOGO
    logoInput.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            this.value = "";
            return;
        }

        if (file.size > 1024 * 1024) {
            alert("Please select a logo smaller than 1 MB.");
            this.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            companyLogo = event.target.result;
            logoPreview.src = companyLogo;
            logoPreview.style.display = "block";
        };

        reader.readAsDataURL(file);
    });

    // SAVE COMPANY PROFILE
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        const profile = {
            companyName: companyName.value.trim(),
            phone: phone.value.trim(),
            email: email.value.trim(),
            address: address.value.trim(),
            logo: companyLogo
        };

        if (!profile.companyName) {
            message.style.color = "red";
            message.textContent = "Please enter your company name.";
            return;
        }

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(profile)
            );

            message.style.color = "green";
            message.textContent = "Company profile saved successfully!";

        } catch (error) {
            message.style.color = "red";
            message.textContent =
                "Could not save profile. Try using a smaller logo.";
        }
    });

});
