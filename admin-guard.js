
(function () {

    // Check whether administrator is logged in
    if (sessionStorage.getItem("netbillAdminLoggedIn") !== "true") {
        window.location.replace("admin-login.html");
        return;
    }

    // Add logout button when dashboard loads
    document.addEventListener("DOMContentLoaded", function () {

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

        logoutButton.addEventListener("click", function () {

            if (confirm("Are you sure you want to log out?")) {

                sessionStorage.removeItem("netbillAdminLoggedIn");

                window.location.replace("admin-login.html");
            }

        });

        document.body.appendChild(logoutButton);

    });

})();
