// Archivo: funciones.js (SIN la palabra export en ninguna parte)

function openExportPdfModal() {
  const pdfSelect = document.getElementById('pdf-export-week');
  if (pdfSelect) {
    if (window.state.weeks.length === 0) {
      pdfSelect.innerHTML = '<option value="">Sin semanas</option>';
    } else {
      pdfSelect.innerHTML = window.state.weeks.map(w => 
        `<option value="${w.id}" ${w.id === window.state.rankingWeekId ? 'selected' : ''}>${w.title} (${w.date || 'Sin fecha'})</option>`
      ).join('');
    }
  }
  if (typeof openModal === 'function') {
    openModal('modal-export-pdf');
  }
}

function generatePdfReport() {
  const weekId = document.getElementById('pdf-export-week').value;
  const category = document.getElementById('pdf-export-category').value;
  
  const week = window.state.weeks.find(w => w.id === weekId);
  if (!week) {
    if (typeof showToast === 'function') showToast('Selecciona una semana válida', 'error');
    return;
  }

  let filteredReferees = window.state.referees;
  if (category !== 'ALL') {
    filteredReferees = filteredReferees.filter(r => r.category === category);
  }

  const tests = week.tests || [];
  const totalTestsCount = tests.length;

  const refereeScores = {};
  filteredReferees.forEach(ref => {
    refereeScores[ref.id] = { referee: ref, sumPointsBase10: 0, evaluatedTestsCount: 0 };
  });

  tests.forEach(test => {
    const marks = test.marks || {};
    const totalReps = test.reps || 1;
    const registeredRefIds = Object.keys(marks);

    if (registeredRefIds.length > 0) {
      const bestPerRep = [];
      for (let r = 0; r < totalReps; r++) {
        let validTimesForRep = [];
        registeredRefIds.forEach(refId => {
          let refMarks = marks[refId];
          if (typeof refMarks === 'number') refMarks = [refMarks];
          if (Array.isArray(refMarks) && refMarks[r] !== undefined && refMarks[r] !== null && refMarks[r] > 0) {
            validTimesForRep.push(refMarks[r]);
          }
        });
        bestPerRep[r] = validTimesForRep.length > 0 ? Math.min(...validTimesForRep) : null;
      }

      filteredReferees.forEach(ref => {
        if (marks[ref.id] !== undefined && marks[ref.id] !== null) {
          let refMarks = marks[ref.id];
          if (typeof refMarks === 'number') refMarks = [refMarks];
          if (!Array.isArray(refMarks)) refMarks = [];

          let sumTestPoints = 0;
          for (let r = 0; r < totalReps; r++) {
            const t = refMarks[r];
            const bestForRep = bestPerRep[r];
            if (t !== undefined && t !== null && t > 0 && bestForRep !== null) {
              sumTestPoints += (10 * (bestForRep / t));
            }
          }
          const testAvgScore = sumTestPoints / totalReps;
          refereeScores[ref.id].sumPointsBase10 += testAvgScore;
          refereeScores[ref.id].evaluatedTestsCount += 1;
        }
      });
    }
  });

  const sortedRanking = Object.values(refereeScores).map(item => {
    const weeklyAverage = totalTestsCount > 0 ? (item.sumPointsBase10 / totalTestsCount) : 0;
    return { ...item, weeklyAverage };
  }).sort((a, b) => b.weeklyAverage - a.weeklyAverage);

  const startDate = week.date || 'No especificada';
  let endDate = 'No especificada';
  if (week.date) {
    let d = new Date(week.date + 'T00:00:00');
    d.setDate(d.getDate() + 6);
    endDate = d.toISOString().split('T')[0];
  }

  let rowsHtml = '';
  sortedRanking.forEach((item, index) => {
    rowsHtml += `
      <tr>
        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.referee.name}</td>
        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #ddd;">${item.referee.category}</td>
        <td style="text-align: center; padding: 10px; border-bottom: 1px solid #ddd;">${item.evaluatedTestsCount} / ${totalTestsCount}</td>
        <td style="text-align: right; padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: #035388;">${item.weeklyAverage.toFixed(2)} / 10</td>
      </tr>
    `;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Ranking - ${week.title}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 20px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #035388; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-container { width: 75px; height: 75px; }
        .logo-container img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
        .title-area { text-align: center; flex-grow: 1; padding: 0 15px; }
        .title-area h2 { margin: 0; font-size: 18px; color: #0c4a6e; }
        .title-area p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #035388; color: white; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
        th:first-child { text-align: center; width: 50px; }
        th:last-child { text-align: right; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-container"><img src="https://lh3.googleusercontent.com/d/1bmQL4rMiLTGrNW8TfqQpI_6eN3QhMt2g" alt="Logo"></div>
        <div class="title-area">
          <h2>ASOCIACIÓN DE ÁRBITROS DE FÚTBOL DEL ESTADO SUCRE</h2>
          <p>Comisión de Preparación Física y Rendimiento</p>
        </div>
      </div>
      <div class="meta-box">
        <div><strong>Semana:</strong> ${week.title}</div>
        <div><strong>Categoría:</strong> ${category === 'ALL' ? 'Todas' : category}</div>
        <div><strong>Inicio:</strong> ${startDate} | <strong>Fin:</strong> ${endDate}</div>
      </div>
      <table>
        <thead><tr>
          <th>Pos</th>
          <th>Árbitro / Atleta</th>
          <th style="text-align: center;">Categoría</th>
          <th style="text-align: center;">Pruebas</th>
          <th style="text-align: right;">Nota Semanal</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="footer"><p>Reporte generado desde el Sistema de Control de Rendimiento Físico - Árbitros Sucre © 2026</p></div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  printWindow.document.close();
  
  if (typeof closeModal === 'function') {
    closeModal('modal-export-pdf');
  }
}
