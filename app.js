// @author piercer
const STORAGE_KEY = "piercer_clt_pj_v1";
const $ = (id) => document.getElementById(id);

function brl(n) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function calcInss(gross) {
  const brackets = [
    { limit: 1518.00, rate: 0.075 },
    { limit: 2793.88, rate: 0.09 },
    { limit: 4190.83, rate: 0.12 },
    { limit: 8157.41, rate: 0.14 },
  ];
  let prev = 0, total = 0;
  for (const b of brackets) {
    if (gross <= prev) break;
    const slice = Math.min(gross, b.limit) - prev;
    total += slice * b.rate;
    prev = b.limit;
  }
  return total;
}

function calcIrrf(base) {
  if (base <= 2259.20) return 0;
  if (base <= 2826.65) return Math.max(0, base * 0.075 - 169.44);
  if (base <= 3751.05) return Math.max(0, base * 0.15 - 381.44);
  if (base <= 4664.68) return Math.max(0, base * 0.225 - 662.77);
  return Math.max(0, base * 0.275 - 896.00);
}

try {
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (s) {
    ["grossClt", "benefitsClt", "otherDesc", "pjTaxPct", "pjAccountant"].forEach((id) => {
      if (s[id] !== undefined) $(id).value = s[id];
    });
  }
} catch {}

function calculate() {
  const gross = Math.max(0, Number($("grossClt").value) || 0);
  const benefits = Math.max(0, Number($("benefitsClt").value) || 0);
  const otherDesc = Math.max(0, Number($("otherDesc").value) || 0);
  const pjTax = Math.max(0, Number($("pjTaxPct").value) || 0) / 100;
  const pjCost = Math.max(0, Number($("pjAccountant").value) || 0);

  const inss = calcInss(gross);
  const irrf = calcIrrf(Math.max(0, gross - inss));
  const netClt = Math.max(0, gross - inss - irrf - otherDesc);
  const fgts = gross * 0.08;
  // Pacote anualizado por mês: 12 salários + 13º + 1/3 férias + FGTS + benefícios
  const monthlyEquivalent = (netClt * 13.333 / 12) + fgts + benefits;
  const pjNeeded = (monthlyEquivalent + pjCost) / Math.max(0.1, 1 - pjTax);

  $("outCltNet").textContent = brl(netClt);
  $("outCltPack").textContent = `Pacote real (c/ 13º, férias, FGTS): ${brl(monthlyEquivalent)}/mês`;
  $("outPjNeeded").textContent = brl(pjNeeded);
  $("outPjRatio").textContent = `Fator: ${gross > 0 ? (pjNeeded / gross).toFixed(2) : "0"}x do bruto CLT`;
  $("outCltTaxes").textContent = brl(inss + irrf);
  $("outTaxSplit").textContent = `INSS: ${brl(inss)} • IRRF: ${brl(irrf)}`;
  $("outFgts").textContent = brl(fgts);

  const netPct = gross > 0 ? Math.max(0, Math.min(100, (netClt / gross) * 100)) : 100;
  const r = 44, c = 2 * Math.PI * r;
  $("donutSvg").innerHTML = `
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--red)" stroke-width="14" />
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--green)" stroke-width="14"
      stroke-dasharray="${(netPct / 100) * c} ${c}" transform="rotate(-90 60 60)" />
    <text x="60" y="64" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700" font-family="JetBrains Mono">${Math.round(netPct)}%</text>
  `;
  $("donutLegend").innerHTML = `● Líquido: <strong style="color:var(--green)">${brl(netClt)}</strong><br>● INSS + IRRF: <strong style="color:var(--red)">${brl(inss + irrf)}</strong>`;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      grossClt: $("grossClt").value,
      benefitsClt: $("benefitsClt").value,
      otherDesc: $("otherDesc").value,
      pjTaxPct: $("pjTaxPct").value,
      pjAccountant: $("pjAccountant").value,
    }));
  } catch {}
}

["grossClt", "benefitsClt", "otherDesc", "pjTaxPct", "pjAccountant"].forEach((id) => $(id).addEventListener("input", calculate));
$("printBtn").addEventListener("click", () => window.print());
$("resetBtn").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
calculate();
