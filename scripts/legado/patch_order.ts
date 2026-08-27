app.post("/api/binance/order", authorizeDashboard, async (req, res) => {
  const { environment, symbol, side, type, quantity, price, client_order_id } = req.body;
  try {
    const r = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dashboard-token": (req.headers["x-dashboard-token"] || "") as string
      },
      body: JSON.stringify({ environment, symbol, side, type, quantity, price, client_order_id })
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
