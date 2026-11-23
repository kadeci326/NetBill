 
(function () {

    async function protectDashboard() {

        // Make sure Supabase is available
        const db = window.netbillSupabase;

        if (!db) {
            window.location.replace("admin-login.html");
            return;
        }

        try {

            // STEP 1: Verify the real Supabase login session
            const { data, error } = await db.auth.getSession();

            if (error || !data.session) {
                window.location.replace("admin-login.html");
                return;
            }

            const user = data.session.user;

            // STEP 2: Verify the administrator identity
            const savedOwnerId =
                localStorage.getItem("netbillOwnerId");

            if (!savedOwnerId || savedOwnerId !== user.id) {
                window.location.replace("admin-login.html");
                return;
            }

            // STEP 3: Verify company ownership in Supabase
            const { data: company, error: companyError } = await db
                .from("netbill_companies")
                .select("id, company_name")
                .eq("owner_id", user.id)
                .maybeSingle();

            if (companyError || !company) {
                window.location.replace("admin-login.html");
                return;
            }

            // STEP 4: Verify the saved company ID
            const savedCompanyId =
                localStorage.getItem("netbillCompanyId");

            if (!savedCompanyId || savedCompanyId !== company.id) {
                window.location.replace("admin-login.html");
                return;
            }

            // Administrator has passed all security checks
            sessionStorage.setItem(
                "netbillAdminLoggedIn",
                "true"
            );

            // STEP 5: Create secure logout button
            createLogoutButton(db);

        } catch (error) {

            console.error("NetBill security check failed:", error);

            window.location.replace("admin-login.html");

        }

    }

    function createLogoutButton(db) {

        if (document.getElementById("netbillLogoutButton")) {
            return;
        }

        const logoutButton = document.createElement("button");

        logoutButton.id = "netbillLogoutButton";
        logoutButton.textContent = "LOGOUT";

        logoutButton.style.position = "fixed";
        logoutButton.style.top = "15px";
        logoutButton.style.right = "15px";
        logoutButton.style.zIndex = "99999";
        logoutButton.style.padding = "10px 18px";
        logoutButton.style.background = "#dc3545";
        logoutButton.style.color = "white";
        logoutButton.style.border = "none";
        logoutButton.style.borderRadius = "6px";
        logoutButton.style.cursor = "pointer";
        logoutButton.style.fontWeight = "bold";

        logoutButton.addEventListener("click", async function () {

            if (!confirm("Are you sure you want to log out?")) {
                return;
            }

            logoutButton.disabled = true;
            logoutButton.textContent = "LOGGING OUT...";

            try {

                const { error } = await db.auth.signOut();

                if (error) {
                    throw error;
                }

                sessionStorage.removeItem("netbillAdminLoggedIn");

                localStorage.removeItem("netbillOwnerId");
                localStorage.removeItem("netbillCompanyId");
                localStorage.removeItem("netbillOwnerEmail");
                localStorage.removeItem("netbillCloudCompanyName");

                window.location.replace("admin-login.html");

            } catch (error) {

                console.error("NetBill logout failed:", error);

                alert("Logout failed: " + error.message);

                logoutButton.disabled = false;
                logoutButton.textContent = "LOGOUT";

            }

        });

        document.body.appendChild(logoutButton);

    }

    // Run after the page is ready
    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            protectDashboard
        );

    } else {

        protectDashboard();

    }

})();
