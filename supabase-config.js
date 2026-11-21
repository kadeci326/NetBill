 
const NETBILL_SUPABASE_URL =
    "https://orvnapygkxskkzktzsev.supabase.co";

const NETBILL_SUPABASE_KEY =
    "sb_publishable_43ofOa1dBI76WeLCWadSQg_oV6LtR_";

window.netbillSupabase = window.supabase.createClient(
    NETBILL_SUPABASE_URL,
    NETBILL_SUPABASE_KEY,
    {
        auth: {
            experimental: {
                passkey: true
            }
        }
    }
);

console.log("NetBill Supabase connected successfully with passkey support.");
