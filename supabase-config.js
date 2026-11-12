 const NETBILL_SUPABASE_URL = "https://orvnapygkxskkzktzsev.supabase.co";
const NETBILL_SUPABASE_KEY = "sb_publishable_43ofOa1dBI76WeLCWadSQg_oV6LtR_4";

window.netbillSupabase = window.supabase.createClient(
    NETBILL_SUPABASE_URL,
    NETBILL_SUPABASE_KEY
);

console.log("NetBill Supabase connected successfully.");