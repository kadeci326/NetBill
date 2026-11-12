
(function () {
    "use strict";

    const db = window.netbillSupabase;

    function getCompanyId() {
        return localStorage.getItem("netbillCompanyId");
    }

    function showMessage(message, success = true) {
        const box = document.getElementById("routerMessage");
        if (!box) return;

        box.textContent = message;
        box.style.color = success ? "#166534" : "#991b1b";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    async function loadRouters() {
        const list = document.getElementById("routerList");
        if (!list) return;

        try {
            const companyId = getCompanyId();

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            const { data, error } = await db
                .from("netbill_routers")
                .select("*")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                list.innerHTML =
                    '<tr><td colspan="7">No routers registered yet.</td></tr>';
                return;
            }

            list.innerHTML = data.map(function (router) {
                return `
                    <tr>
                        <td>${escapeHTML(router.router_name)}</td>
                        <td>${escapeHTML(router.router_ip)}</td>
                        <td>${escapeHTML(router.api_port)}</td>
                        <td>${escapeHTML(router.router_model || "Not specified")}</td>
                        <td>${escapeHTML(router.routeros_version || "Not detected")}</td>
                        <td>${escapeHTML(router.connection_status)}</td>
                        <td>Not connected yet</td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            list.innerHTML =
                '<tr><td colspan="7">Could not load routers.</td></tr>';
            console.error("Router loading error:", error);
            showMessage(error.message, false);
        }
    }

    async function registerRouter(event) {
        event.preventDefault();

        const button = event.target.querySelector('button[type="submit"]');

        try {
            if (!db) {
                throw new Error("Supabase connection not found.");
            }

            const companyId = getCompanyId();

            if (!companyId) {
                throw new Error("Company ID not found. Please log in again.");
            }

            const { data: sessionData, error: sessionError } =
                await db.auth.getSession();

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                throw new Error("Please log in again.");
            }

            const router = {
                company_id: companyId,
                router_name: document.getElementById("routerName").value.trim(),
                router_ip: document.getElementById("routerIP").value.trim(),
                api_port: Number(document.getElementById("routerPort").value),
                router_model:
                    document.getElementById("routerModel").value.trim() || null,
                connection_status: "Not Connected"
            };

            if (!router.router_name || !router.router_ip) {
                throw new Error("Please enter the router name and IP address.");
            }

            if (
                !Number.isInteger(router.api_port) ||
                router.api_port < 1 ||
                router.api_port > 65535
            ) {
                throw new Error("Please enter a valid API port.");
            }

            button.disabled = true;
            button.textContent = "Registering...";

            const { error } = await db
                .from("netbill_routers")
                .insert([router]);

            if (error) throw error;

            showMessage("SUCCESS! Router registered in NetBill.");

            event.target.reset();
            document.getElementById("routerPort").value = 8729;

            await loadRouters();

        } catch (error) {
            console.error("Router registration error:", error);
            showMessage("REGISTRATION ERROR: " + error.message, false);

        } finally {
            button.disabled = false;
            button.textContent = "Register Router";
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("routerForm");

        if (!form || !db) {
            console.error("Router Management could not start.");
            return;
        }

        form.addEventListener("submit", registerRouter);
        loadRouters();
    });

})();
