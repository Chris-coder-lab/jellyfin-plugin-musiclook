  /* ---------- Audio-DSP: Rauschunterdrückung und De-Esser (läuft im Browser des Hörers, nicht auf dem Server) ---------- */
  // mode 'denoise': spektrale Rauschunterdrückung (STFT, adaptive Rauschschätzung, Gewinn nach "decision-directed" Wiener-Regel)
  // mode 'deess'  : Split-Band-De-Esser (Linkwitz-Riley 4. Ordnung bei 5,5 kHz; nur das Höhenband wird abgesenkt, wenn es überwiegt)
  // process(inputs, outputs, n): inputs/outputs sind Listen von Float32Array-Kanälen (wie bei einem AudioWorklet).
  function MLDspCreate(sr, mode) {
    var PI2 = 2 * Math.PI;

    function biquadCoef(type, fc, q) {
      var w0 = PI2 * fc / sr, c = Math.cos(w0), s = Math.sin(w0), al = s / (2 * q), a0 = 1 + al, b0, b1, b2;
      if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
    }

    /* ---- De-Esser ---- */
    function makeDeess() {
      var q = 0.70710678, lp = biquadCoef('lp', 5500, q), hp = biquadCoef('hp', 5500, q);
      var THR = 0.28;          // Anteil der Höhen-Leistung an der Gesamtleistung, ab dem abgesenkt wird
      var EXP = 0.375;         // entspricht Verhältnis 4:1
      var GMIN = 0.35;         // höchstens etwa -9 dB
      var aTot = 1 - Math.exp(-1 / (0.15 * sr)), aAtk = 1 - Math.exp(-1 / (0.001 * sr)), aRel = 1 - Math.exp(-1 / (0.03 * sr));
      var gAtk = 1 - Math.exp(-1 / (0.0007 * sr)), gRel = 1 - Math.exp(-1 / (0.04 * sr));
      var st = [new Float64Array(8), new Float64Array(8)];   // je Kanal: lp1, lp2, hp1, hp2 (z1, z2)
      var pTot = 0, pHF = 0, g = 1, lo = [0, 0], hi = [0, 0];
      return function (inp, out, n) {
        var nch = Math.min(inp.length, out.length, 2);
        if (!nch) return;
        for (var i = 0; i < n; i++) {
          var xx = 0, hh = 0;
          for (var c = 0; c < nch; c++) {
            var z = st[c], x = inp[c][i], y;
            y = lp.b0 * x + z[0]; z[0] = lp.b1 * x - lp.a1 * y + z[1]; z[1] = lp.b2 * x - lp.a2 * y;
            var l = y;
            y = lp.b0 * l + z[2]; z[2] = lp.b1 * l - lp.a1 * y + z[3]; z[3] = lp.b2 * l - lp.a2 * y;
            lo[c] = y;
            y = hp.b0 * x + z[4]; z[4] = hp.b1 * x - hp.a1 * y + z[5]; z[5] = hp.b2 * x - hp.a2 * y;
            var h = y;
            y = hp.b0 * h + z[6]; z[6] = hp.b1 * h - hp.a1 * y + z[7]; z[7] = hp.b2 * h - hp.a2 * y;
            hi[c] = y;
            xx += x * x; hh += y * y;
          }
          xx /= nch; hh /= nch;
          pTot += aTot * (xx - pTot);
          pHF += (hh > pHF ? aAtk : aRel) * (hh - pHF);
          var tgt = 1;
          if (pTot > 1e-7) {
            var frac = pHF / pTot;
            if (frac > THR) { tgt = Math.pow(THR / frac, EXP); if (tgt < GMIN) tgt = GMIN; }
          }
          g += (tgt < g ? gAtk : gRel) * (tgt - g);
          for (var c2 = 0; c2 < nch; c2++) out[c2][i] = lo[c2] + g * hi[c2];
        }
        for (var c3 = nch; c3 < out.length; c3++) out[c3].set(out[0].subarray(0, n));
      };
    }

    /* ---- Rauschunterdrückung ---- */
    function makeDenoise() {
      var N = 1024, H = 512, K = N / 2 + 1;
      var win = new Float64Array(N), cosT = new Float64Array(N / 2), sinT = new Float64Array(N / 2), rev = new Uint16Array(N);
      var i, bits = 10;
      for (i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(PI2 * i / N));
      for (i = 0; i < N / 2; i++) { cosT[i] = Math.cos(PI2 * i / N); sinT[i] = Math.sin(PI2 * i / N); }
      for (i = 0; i < N; i++) { var r = 0, v = i; for (var b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>= 1; } rev[i] = r; }
      var re = new Float64Array(N), im = new Float64Array(N);
      function fft() {
        var a, j, k, size, half, step, tr, ti, wr, wi;
        for (a = 0; a < N; a++) { j = rev[a]; if (j > a) { tr = re[a]; re[a] = re[j]; re[j] = tr; tr = im[a]; im[a] = im[j]; im[j] = tr; } }
        for (size = 2; size <= N; size <<= 1) {
          half = size >> 1; step = N / size;
          for (a = 0; a < N; a += size) {
            for (j = 0, k = 0; j < half; j++, k += step) {
              wr = cosT[k]; wi = -sinT[k];
              var p = a + j, q2 = p + half;
              tr = re[q2] * wr - im[q2] * wi; ti = re[q2] * wi + im[q2] * wr;
              re[q2] = re[p] - tr; im[q2] = im[p] - ti; re[p] += tr; im[p] += ti;
            }
          }
        }
      }
      var A_PS = 0.6;                                  // Glättung der Leistung
      var RISE = Math.pow(10, 3 / 10 / (sr / H));      // Rauschschätzung darf mit ca. 3 dB/s ansteigen
      var BIAS = 1.5;                                  // Ausgleich: das Minimum unterschätzt das mittlere Rauschen
      var DD = 0.92, GMIN = 0.25;                      // Entscheidungsgesteuerte Glättung, höchstens ca. -12 dB
      var chans = [];
      function mk() {
        return {
          x: new Float32Array(N), acc: new Float32Array(N), wp: 0, hop: 0, first: true,
          ps: new Float64Array(K), nz: new Float64Array(K), a2: new Float64Array(K), g: new Float64Array(K), gs: new Float64Array(K)
        };
      }
      function frame(s) {
        var k, p, idx = s.wp;
        for (var a = 0; a < N; a++) { re[a] = s.x[idx] * win[a]; im[a] = 0; if (++idx === N) idx = 0; }
        fft();
        for (k = 0; k < K; k++) {
          p = re[k] * re[k] + im[k] * im[k];
          if (s.first) { s.ps[k] = p; s.nz[k] = Math.max(p, 1e-9); s.a2[k] = 0; }
          else {
            s.ps[k] = A_PS * s.ps[k] + (1 - A_PS) * p;
            var nz = s.nz[k], ps = s.ps[k];
            if (ps < nz) nz += 0.2 * (ps - nz); else nz = Math.min(ps, nz * RISE);
            s.nz[k] = nz = Math.max(nz, 1e-9);
          }
          var nT = s.nz[k] * BIAS, gam = p / nT, xi = DD * s.a2[k] / nT + (1 - DD) * Math.max(gam - 1, 0);
          var gk = xi / (1 + xi);
          if (gk < GMIN) gk = GMIN;
          s.g[k] = gk;
          s.a2[k] = gk * gk * p;
        }
        s.first = false;
        // Gewinn glätten: über die Frequenz (3 Punkte) und in der Zeit (schnell hoch, langsamer runter)
        for (k = 0; k < K; k++) {
          var l = k > 0 ? s.g[k - 1] : s.g[k], rr = k < K - 1 ? s.g[k + 1] : s.g[k];
          var sm = 0.25 * l + 0.5 * s.g[k] + 0.25 * rr;
          s.gs[k] += (sm > s.gs[k] ? 0.7 : 0.35) * (sm - s.gs[k]);
        }
        for (k = 0; k < K; k++) { re[k] *= s.gs[k]; im[k] *= s.gs[k]; }
        for (k = 1; k < N / 2; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
        // Rücktransformation (Konjugations-Trick)
        for (k = 0; k < N; k++) im[k] = -im[k];
        fft();
        idx = s.wp;
        for (var b2 = 0; b2 < N; b2++) { s.acc[idx] += re[b2] / N * win[b2]; if (++idx === N) idx = 0; }
      }
      return function (inp, out, n) {
        var nch = Math.min(inp.length, out.length, 2);
        if (!nch) return;
        while (chans.length < nch) chans.push(mk());
        for (var c = 0; c < nch; c++) {
          var s = chans[c], xin = inp[c], xout = out[c];
          for (var i2 = 0; i2 < n; i2++) {
            xout[i2] = s.acc[s.wp];
            s.acc[s.wp] = 0;
            s.x[s.wp] = xin[i2];
            if (++s.wp === N) s.wp = 0;
            if (++s.hop === H) { s.hop = 0; frame(s); }
          }
        }
        for (var c3 = nch; c3 < out.length; c3++) out[c3].set(out[0].subarray(0, n));
      };
    }

    return { process: mode === 'deess' ? makeDeess() : makeDenoise() };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = MLDspCreate;

/* AudioWorklet-Prozessor: fuehrt den DSP-Kern im Audio-Thread des Browsers aus. */
if (typeof registerProcessor === 'function' && typeof AudioWorkletProcessor === 'function') {
  class MLDspProcessor extends AudioWorkletProcessor {
    constructor(opts) {
      super();
      var mode = (opts && opts.processorOptions && opts.processorOptions.mode) === 'deess' ? 'deess' : 'denoise';
      this.dsp = MLDspCreate(sampleRate, mode);
    }
    process(inputs, outputs) {
      var i = inputs[0], o = outputs[0];
      if (!o || !o.length) return true;
      if (!i || !i.length) { for (var c = 0; c < o.length; c++) o[c].fill(0); return true; }
      this.dsp.process(i, o, o[0].length);
      return true;
    }
  }
  registerProcessor('ml-dsp', MLDspProcessor);
}
