/**
 * EngiLab — Top 10 Dynamic Leaderboard
 */

import { getState } from "./app.js";

const MOCK_STUDENTS = [
  { name: "Aarav Sharma", track: "C++ / ICPC", xp: 420 },
  { name: "Maya Lin", track: "Python / AI", xp: 360 },
  { name: "Rohan Verma", track: "Java / Backend", xp: 310 },
  { name: "Elena Rostova", track: "C++ / Systems", xp: 250 },
  { name: "Dev Patel", track: "Python / GSoC", xp: 190 },
  { name: "Sofia Chen", track: "Java / DSA", xp: 140 },
  { name: "Liam O'Connor", track: "C++ / STL", xp: 90 },
  { name: "Nadia Kim", track: "Python / Web", xp: 50 },
  { name: "Kabir Nair", track: "Java / Core", xp: 20 }
];

function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-body");
  if (!tbody) return;

  const { xp: userXP } = getState();

  const combined = [
    ...MOCK_STUDENTS.map((s) => ({ ...s, isYou: false })),
    { name: "You", track: "EngiLab Student", xp: userXP, isYou: true }
  ];

  // Sort descending by XP; on ties, place "You" higher so progress feels rewarding
  combined.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return a.isYou ? -1 : b.isYou ? 1 : a.name.localeCompare(b.name);
  });

  const top10 = combined.slice(0, 10);

  tbody.innerHTML = "";
  top10.forEach((student, index) => {
    const tr = document.createElement("tr");
    if (student.isYou) {
      tr.className = "leaderboard-row--you";
    }

    const rank = index + 1;
    const rankLabel =
      rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : `#${rank}`;

    tr.innerHTML = `
      <td class="rank-num">${rankLabel}</td>
      <td>${student.name}</td>
      <td><span class="tag">${student.track}</span></td>
      <td class="xp-cell">${student.xp} XP</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", renderLeaderboard);
window.addEventListener("engilab:state-updated", renderLeaderboard);
