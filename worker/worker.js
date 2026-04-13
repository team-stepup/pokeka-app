export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const name = url.searchParams.get("name") || "";
    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "100";

    const targetUrl = `https://cardrush.media/pokemon/buying_prices?name=${encodeURIComponent(name)}&page=${page}&limit=${limit}&sort[key]=amount&sort[order]=desc`;

    try {
      const res = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      const html = await res.text();

      const jsonMatch = html.match(/"buyingPrices"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
      if (!jsonMatch) {
        return jsonResponse({ error: "データが見つかりません", results: [] });
      }

      const data = JSON.parse(jsonMatch[1]);
      const results = data.map((item) => ({
        name: item.name,
        price: item.amount,
        rarity: item.rarity || "",
        pack: item.pack_name || "",
        modelNumber: item.model_number || "",
      }));

      return jsonResponse({ results, count: results.length, page: Number(page) });
    } catch (e) {
      return jsonResponse({ error: e.message, results: [] }, 500);
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
