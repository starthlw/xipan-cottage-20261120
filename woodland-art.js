(function () {
  'use strict';
  const original = window.RiversideArt, cache = new Map();
  let serial = 0;
  const mix = (hex, target, weight) => '#' + [0, 2, 4].map(i => Math.round(parseInt(hex.slice(1 + i, 3 + i), 16) * (1 - weight) + parseInt(target.slice(1 + i, 3 + i), 16) * weight).toString(16).padStart(2, '0')).join('');
  // Paint IDs remain unique when several characters and dishes share the DOM.
  function painted(body, box) {
    const prefix = 'woodland-' + (++serial);
    const colors = [...new Set([...body.matchAll(/fill="(#[\da-f]{6})"/gi)].map(m => m[1]))];
    let defs = '';
    colors.forEach((color, i) => {
      const id = prefix + '-tone-' + i;
      defs += `<radialGradient id="${id}" cx=".28" cy=".22" r=".95"><stop stop-color="${mix(color, '#f4e6bd', .27)}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${mix(color, '#655436', .3)}"/></radialGradient>`;
      body = body.replaceAll(`fill="${color}"`, `fill="url(#${id})"`);
    });
    defs += `<filter id="${prefix}-brush" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="2" seed="11" result="noise"/><feColorMatrix in="noise" type="matrix" values="0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .25 0 0 0 .06 0" result="faint"/><feComposite in="faint" in2="SourceGraphic" operator="in" result="texture"/><feBlend in="SourceGraphic" in2="texture" mode="multiply"/></filter>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" aria-hidden="true"><defs>${defs}</defs><g filter="url(#${prefix}-brush)">${body}</g></svg>`;
  }
  function food(id) {
    const key = 'food-' + id;
    if (!cache.has(key)) {
      const source = original.food(id);
      cache.set(key, painted(source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>')), '0 0 120 100'));
    }
    return cache.get(key);
  }
  function animal(kind, color, chef = false) {
    const key = `${kind}-${color}-${chef}`;
    if (cache.has(key)) return cache.get(key);
    const fur = kind === 'panda' ? '#e6debe' : mix(color, '#ab9a70', .16), dark = mix(fur, '#665039', .45);
    let ears, tail = '', marks = '';
    if (kind === 'rabbit') ears = `<path d="M32 35Q20-11 31-9q13 1 11 40M53 31Q57-12 67-7q11 9-4 44" fill="${fur}" stroke="${dark}" stroke-width=".7"/><path d="M33 26q-7-27-2-29 6 1 7 29M58 27q4-26 8-27 5 7-3 28" fill="#ccac93"/>`;
    else if (kind === 'cat' || kind === 'fox') ears = `<path d="M28 40l-5-25 22 15M55 30l20-14-4 28" fill="${fur}" stroke="${dark}" stroke-width=".8"/><path d="M29 32l-3-11 12 9M63 31l9-10-2 15" fill="#c2a089"/>`;
    else ears = `<ellipse cx="29" cy="31" rx="9" ry="10" fill="${kind === 'panda' ? '#6c7560' : fur}"/><ellipse cx="70" cy="32" rx="9" ry="10" fill="${kind === 'panda' ? '#6c7560' : fur}"/><ellipse cx="29" cy="32" rx="5" ry="6" fill="#bfa181"/><ellipse cx="70" cy="33" rx="5" ry="6" fill="#bfa181"/>`;
    if (kind === 'squirrel') tail = `<path d="M69 94q39-2 25-40-8-25-24-13-15 13 5 28 11 11 0 13" fill="${fur}" stroke="${dark}" stroke-width=".8"/><path d="M85 81q15-20-7-33M82 77q11-18-7-27" fill="none" stroke="#dab385" stroke-width="1.2" opacity=".5"/>`;
    if (kind === 'fox') tail = `<path d="M65 98q29 5 28-23-15-2-28 13" fill="${fur}"/><path d="M88 76l-7 4 3 4-7 5 7 3q9-5 9-17z" fill="#ede0bc"/>`;
    if (kind === 'panda') marks = '<ellipse cx="39" cy="46" rx="7" ry="9" fill="#66705c" transform="rotate(20 39 46)"/><ellipse cx="61" cy="47" rx="7" ry="9" fill="#66705c" transform="rotate(-20 61 47)"/>';
    if (kind === 'cat') marks = '<path d="M41 27l4 9m7-11v11m8-9l-3 10" stroke="#556653" stroke-width="2" stroke-linecap="round"/>';
    const shirt = chef ? '#e9dfbe' : kind === 'fox' ? '#ab9472' : '#899875', apron = chef ? '#a6b184' : '#d4c09a';
    const body = `<ellipse cx="53" cy="110" rx="25" ry="5" fill="#596342" opacity=".13"/>${tail}<path d="M34 61q-9 18-7 42 19 9 44 0 5-24-7-42" fill="${shirt}" stroke="#85785a" stroke-width=".7"/><path d="M34 68l-9 20 6 5 10-17m23-6l13 17-6 7-10-17" fill="${shirt}"/><path d="M36 66l5 13 19-1 6-12M40 80l-2 23 26 2-3-26" fill="${apron}" stroke="#a29470" stroke-width=".7"/><path d="M42 82l-1 17m18-19l2 20" stroke="#f0e1bb" opacity=".5" stroke-width="1.5"/><path d="M33 103v7h12v-7m13 1v7h12v-8" fill="${dark}"/><ellipse cx="27" cy="93" rx="5" ry="6" fill="${fur}"/><ellipse cx="74" cy="94" rx="5" ry="6" fill="${fur}"/>${ears}<path d="M26 43q-1-20 23-21 26 1 27 26-1 24-26 24-25-1-24-29" fill="${fur}" stroke="${dark}" stroke-width=".65"/><path d="M31 50q7-8 18-2 9-5 20 3-1 16-19 16-15-1-19-17" fill="#e7d8b5"/>${marks}<path d="M28 43l4-2m-4 8l4-1m40-4l-3-1m4 9l-4-1M37 29l4-2m5-2l4 1m6 0l4 2" stroke="#ead7b1" stroke-width="1" opacity=".45" stroke-linecap="round"/><ellipse cx="40" cy="45" rx="2" ry="2.8" fill="#4c513f"/><ellipse cx="62" cy="46" rx="2" ry="2.8" fill="#4c513f"/><circle cx="39.5" cy="44.4" r=".65" fill="#f3e9cf"/><circle cx="61.5" cy="45.4" r=".65" fill="#f3e9cf"/><ellipse cx="51" cy="56" rx="3" ry="2" fill="#77664c"/><path d="M46 61q5 4 10 0" fill="none" stroke="#8f7755" stroke-width=".8" stroke-linecap="round"/><ellipse cx="33" cy="55" rx="4" ry="2" fill="#c9a285" opacity=".45"/><ellipse cx="68" cy="56" rx="4" ry="2" fill="#c9a285" opacity=".45"/>${chef ? '<path d="M30 27V15q-7-6-3-12 4-7 13-4 9-9 17-2 14-6 18 4 4 8-7 12v16" fill="#efe7cf" stroke="#c1b493" stroke-width=".8"/><path d="M32 22l36 1v9l-36-2" fill="#dacead"/><path d="M37 8l3 10m12-17v17m13-11l-3 13" stroke="#dacead" stroke-width="1.2" opacity=".7"/>' : ''}`;
    cache.set(key, painted(body, '0 -14 100 130'));
    return cache.get(key);
  }
  window.RiversideArt = { ...original, food, animal };
})();
