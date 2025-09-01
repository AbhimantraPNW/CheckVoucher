async function loadMe() {
  const res = await fetch("/user", { credentials: "include" });
  if (!res.ok) {
    console.error("Unauthorized:", res.status);
    location.href = "/login.html";
    return;
  }
  const me = await res.json();
  const target = 9;
  const remaining = target - me.total_buy;
  const percent = Math.min((me.total_buy / target) * 100, 100);

  const sisa = remaining > 0 ? remaining : 0;
  document.getElementById("greet").innerText = `Halo, ${me.username} 👋`;
  // document.getElementById("total").innerText =
  //   `Kamu sudah beli ${me.total_buy} kali`;
  document.getElementById("free").innerText =
    sisa > 0
      ? `Beli ${sisa} lagi untuk dapat 1 free kopi!`
      : `Selamat! Kamu dapat kopi GRATIS!`;

  // Progress bar update
  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progress-text").innerText =
    `${me.total_buy} / ${target} pembelian`;
}
loadMe();
