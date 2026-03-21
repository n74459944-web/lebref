var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
var SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function sbFetch(table, params) {
  var r = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + (params || ""), {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
    next: { revalidate: 300 },
  });
  if (!r.ok) throw new Error("DB error: " + r.status);
  return r.json();
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
