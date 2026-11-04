/**
 * Renderização das views (votação, FIM, resultados, códigos de teste).
 * Namespace: window.Urna.views — depende de state, select, ui.
 */
(function (Urna) {
  'use strict';

  const { El, escapeHtml } = Urna.ui;
  const { currentStep, enteredCode, currentCandidate, isNullVote } = Urna.select;

  function render() {
    const st = Urna.state;
    const step = currentStep(st);
    if (!step || st.isFinished) return;

    El.bannerLabel.textContent = st.labels.banner;
    El.stepBadge.textContent = `ETAPA ${st.stepIndex + 1}/${st.positions.length}`;
    El.stepTitle.textContent = step.title;

    // digit boxes (hidden on branco per spec)
    El.digitBoxes.innerHTML = '';
    for (let i = 0; i < step.digits; i++) {
      const box = document.createElement('div');
      box.className = 'digit-box';
      const d = st.digits[i];
      if (d !== undefined) {
        box.textContent = d;
        box.classList.add('filled');
      } else if (i === st.digits.length) {
        box.classList.add('active');
      }
      El.digitBoxes.appendChild(box);
    }
    El.digitBoxes.hidden = st.isBranco;
    El.digitBoxes.parentElement.hidden = st.isBranco;

    const candidate = currentCandidate(st);

    El.blankMsg.hidden = !st.isBranco;

    El.statusMsg.hidden = !isNullVote(st);
    if (isNullVote(st)) {
      El.warnText.textContent = 'NÚMERO ERRADO';
      El.bigText.textContent = st.nullLabel;
    }

    const showDetails = candidate && !st.isBranco;
    El.detailsBox.hidden = !showDetails;
    if (showDetails) {
      El.vName.textContent = candidate.name;
      El.vParty.textContent = candidate.party || '—';
      El.dParty.hidden = !candidate.party;

      const vice = candidate.vice;
      const suplente = candidate.suplente;
      const second = vice || suplente;
      El.kVice.textContent = vice ? `${st.labels.vice}:` : `${st.labels.suplente}:`;
      El.vVice.textContent = second || '';
      El.dVice.hidden = !second;
    }

    // photo top-right; onerror hides the box
    if (showDetails && candidate.photo) {
      El.candidatePhoto.src = candidate.photo;
      El.candidatePhoto.onerror = () => { El.photoBox.hidden = true; };
      El.candidatePhoto.onload = () => { El.photoBox.hidden = false; };
      El.photoCaption.textContent = step.id;
      El.photoBox.hidden = false;
    } else {
      El.photoBox.hidden = true;
      El.candidatePhoto.removeAttribute('src');
    }
  }

  function showFim() {
    El.fimOverlay.hidden = false;
    Urna.audio.playFimChime();
  }

  function renderResults() {
    const st = Urna.state;
    El.resultsBody.innerHTML = '';
    let total = 0;

    st.positions.forEach((pos, stepIndex) => {
      const posVotes = st.votes.filter(v => v.stepIndex === stepIndex);
      const count = pred => posVotes.filter(pred).length;

      Object.entries(pos.candidates).forEach(([code, c]) => {
        const votes = count(v => v.voteType === 'candidate' && v.code === code);
        total += votes;
        addResultRow(pos.title, code, c.name, votes);
      });
      addResultRow(pos.title, '—', st.blankLabel, count(v => v.voteType === 'blank'));
      addResultRow(pos.title, '—', st.nullLabel, count(v => v.voteType === 'null'));
    });

    El.resultsTotal.textContent = total;
  }

  function addResultRow(cargo, num, name, votes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(cargo)}</td><td class="num">${escapeHtml(num)}</td><td>${escapeHtml(name)}</td><td>${votes}</td>`;
    El.resultsBody.appendChild(tr);
  }

  function renderTestCodes() {
    const st = Urna.state;
    El.testCodesGrid.innerHTML = '';
    st.positions.forEach(pos => {
      const codes = Object.keys(pos.candidates).slice(0, 2).join(' | ') || '—';
      const card = document.createElement('div');
      card.className = 'testcode-card';
      card.innerHTML = `<div class="pos">${escapeHtml(pos.title)} (${pos.digits})</div><div class="codes">${escapeHtml(codes)}</div>`;
      El.testCodesGrid.appendChild(card);
    });
  }

  Urna.views = { render, showFim, renderResults, renderTestCodes };
})(window.Urna = window.Urna || {});