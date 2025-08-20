async function loadMe() {
  const res = await fetch("/user", { credentials: "include" });
  // console.log("ini res", res);
  if (!res.ok) {
    console.error("Unauthorized:", res.status);
    location.href = "/login.html";
    return;
  }
  const me = await res.json();
  // console.log("ini me", me);
  const target = 9;
  const remaining = target - me.total_buy;

  const sisa = remaining > 0 ? remaining : 0;
  document.getElementById("greet").innerText = `Halo, ${me.username}`;
  document.getElementById("total").innerText =
    `Pembelianmu ke - ${me.total_buy}`;
  document.getElementById("free").innerText =
    `Beli ${sisa} lagi untuk dapet free 1 kopi!`;
}
loadMe();
