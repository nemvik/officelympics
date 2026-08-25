function path() {
  return Array.from(arguments);
}

function rectangle(x, y, width, height) {
  return path([x, y], [x + width, y], [x + width, y + height], [x, y + height], [x, y]);
}

function ellipse(cx, cy, rx, ry, steps = 18) {
  return Array.from({ length: steps + 1 }, function (_, index) {
    const angle = index / steps * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

function arc(cx, cy, rx, ry, start, end, steps = 10) {
  return Array.from({ length: steps + 1 }, function (_, index) {
    const angle = start + (end - start) * index / steps;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

function person(cx, top = .18, scale = 1) {
  const headY = top + .08 * scale;
  return [
    ellipse(cx, headY, .055 * scale, .07 * scale),
    path([cx, headY + .07 * scale], [cx, top + .36 * scale]),
    path([cx, top + .18 * scale], [cx - .1 * scale, top + .29 * scale]),
    path([cx, top + .18 * scale], [cx + .1 * scale, top + .29 * scale]),
    path([cx, top + .36 * scale], [cx - .09 * scale, top + .54 * scale]),
    path([cx, top + .36 * scale], [cx + .09 * scale, top + .54 * scale])
  ];
}

function screen(x = .2, y = .16, width = .6, height = .46) {
  return [
    rectangle(x, y, width, height),
    path([x + width / 2, y + height], [x + width / 2, y + height + .13]),
    path([x + width * .34, y + height + .13], [x + width * .66, y + height + .13])
  ];
}

function document(x = .3, y = .14, width = .4, height = .68) {
  return [
    path([x, y], [x + width * .72, y], [x + width, y + height * .2], [x + width, y + height], [x, y + height], [x, y]),
    path([x + width * .72, y], [x + width * .72, y + height * .2], [x + width, y + height * .2]),
    path([x + width * .16, y + height * .42], [x + width * .84, y + height * .42]),
    path([x + width * .16, y + height * .58], [x + width * .76, y + height * .58]),
    path([x + width * .16, y + height * .74], [x + width * .68, y + height * .74])
  ];
}

const BOT_DRAWINGS = Object.freeze({
  coffee: [rectangle(.28, .34, .34, .34), ellipse(.63, .49, .11, .13), path([.36, .28], [.33, .21], [.37, .13]), path([.47, .28], [.44, .2], [.48, .11])],
  printer: [rectangle(.25, .3, .5, .36), rectangle(.32, .12, .36, .24), rectangle(.33, .53, .34, .28), path([.32, .4], [.68, .4])],
  chair: [rectangle(.35, .2, .3, .27), path([.33, .52], [.67, .52]), path([.5, .52], [.5, .75]), path([.5, .75], [.32, .84]), path([.5, .75], [.68, .84]), path([.37, .52], [.34, .68]), path([.63, .52], [.66, .68])],
  plane: [path([.16, .53], [.83, .22], [.61, .76], [.48, .55], [.16, .53]), path([.48, .55], [.83, .22]), path([.48, .55], [.52, .72])],
  calendar: [rectangle(.25, .16, .5, .66), path([.25, .31], [.75, .31]), path([.35, .13], [.35, .24]), path([.65, .13], [.65, .24]), path([.42, .31], [.42, .82]), path([.58, .31], [.58, .82]), path([.25, .48], [.75, .48]), path([.25, .65], [.75, .65])],
  laptop: [rectangle(.25, .16, .5, .46), path([.25, .68], [.17, .79], [.83, .79], [.75, .68], [.25, .68]), path([.43, .73], [.57, .73])],
  headphones: [path([.27, .53], [.27, .39], [.31, .25], [.4, .17], [.5, .14], [.6, .17], [.69, .25], [.73, .39], [.73, .53]), rectangle(.2, .49, .15, .27), rectangle(.65, .49, .15, .27)],
  plant: [path([.34, .59], [.66, .59], [.61, .82], [.39, .82], [.34, .59]), path([.5, .59], [.5, .27]), ellipse(.42, .34, .13, .08), ellipse(.59, .28, .13, .08), ellipse(.55, .47, .14, .08)],
  keyboard: [rectangle(.16, .25, .68, .5), path([.16, .42], [.84, .42]), path([.16, .59], [.84, .59]), path([.32, .25], [.32, .59]), path([.48, .25], [.48, .59]), path([.64, .25], [.64, .59]), path([.33, .68], [.67, .68])],
  meeting: [ellipse(.5, .55, .27, .13), ellipse(.24, .28, .07, .09), ellipse(.5, .22, .07, .09), ellipse(.76, .28, .07, .09), path([.24, .37], [.3, .51]), path([.5, .31], [.5, .42]), path([.76, .37], [.7, .51])],
  email: [rectangle(.18, .23, .64, .54), path([.18, .23], [.5, .52], [.82, .23]), path([.18, .77], [.4, .48]), path([.82, .77], [.6, .48])],
  deadline: [ellipse(.5, .47, .27, .31), path([.5, .47], [.5, .25]), path([.5, .47], [.67, .56]), path([.34, .13], [.27, .22]), path([.66, .13], [.73, .22]), path([.36, .82], [.3, .89]), path([.64, .82], [.7, .89])],
  stapler: [path([.2, .62], [.72, .62], [.8, .72], [.2, .72], [.2, .62]), path([.22, .55], [.32, .26], [.74, .32], [.8, .55], [.22, .55]), path([.67, .32], [.67, .5])],
  scissors: [ellipse(.32, .67, .12, .14), ellipse(.55, .67, .12, .14), path([.38, .56], [.78, .18]), path([.49, .56], [.25, .2]), path([.42, .51], [.47, .47])],
  pencil: [path([.2, .7], [.65, .22], [.78, .34], [.33, .81], [.2, .85], [.2, .7]), path([.65, .22], [.72, .15], [.84, .27], [.78, .34]), path([.2, .7], [.33, .81]), path([.2, .85], [.24, .75])],
  paperclip: [path([.66, .25], [.38, .25], [.27, .36], [.27, .69], [.38, .8], [.62, .8], [.73, .69], [.73, .39], [.64, .3], [.46, .3], [.38, .39], [.38, .64], [.45, .71], [.58, .71], [.64, .65], [.64, .43]), path([.58, .31], [.58, .6])],
  "sticky-note": [rectangle(.23, .18, .56, .6), path([.61, .78], [.79, .6], [.61, .6], [.61, .78]), path([.33, .35], [.67, .35]), path([.33, .48], [.61, .48])],
  mouse: [ellipse(.5, .48, .22, .3), path([.5, .18], [.5, .48]), path([.5, .3], [.38, .3]), path([.5, .18], [.54, .08], [.67, .08])],
  monitor: screen(),
  phone: [rectangle(.31, .1, .38, .78), rectangle(.36, .18, .28, .54), ellipse(.5, .79, .035, .035)],
  clock: [ellipse(.5, .48, .3, .32), path([.5, .48], [.5, .25]), path([.5, .48], [.69, .58]), path([.5, .13], [.5, .18]), path([.5, .78], [.5, .83])],
  "trash-bin": [path([.3, .3], [.7, .3], [.65, .82], [.35, .82], [.3, .3]), path([.25, .25], [.75, .25]), path([.4, .18], [.6, .18], [.65, .25]), path([.43, .39], [.45, .72]), path([.57, .39], [.55, .72])],
  folder: [path([.18, .28], [.4, .28], [.47, .38], [.82, .38], [.75, .78], [.2, .78], [.18, .28]), path([.2, .39], [.76, .39])],
  briefcase: [rectangle(.2, .29, .6, .48), path([.38, .29], [.38, .18], [.62, .18], [.62, .29]), rectangle(.45, .5, .1, .1), path([.2, .47], [.45, .55]), path([.8, .47], [.55, .55])],
  badge: [path([.35, .1], [.5, .27], [.65, .1]), rectangle(.3, .27, .4, .5), ellipse(.5, .43, .08, .09), path([.38, .64], [.62, .64])],
  charger: [rectangle(.24, .3, .25, .29), path([.3, .3], [.3, .18]), path([.41, .3], [.41, .18]), path([.49, .45], [.65, .45], [.75, .55], [.75, .72]), rectangle(.69, .69, .12, .1)],
  umbrella: [arc(.5, .48, .33, .29, Math.PI, Math.PI * 2, 16), path([.17, .48], [.28, .4], [.39, .48], [.5, .4], [.61, .48], [.72, .4], [.83, .48]), path([.5, .19], [.5, .75], [.45, .84], [.38, .8])],
  bottle: [path([.42, .13], [.58, .13], [.58, .27], [.65, .36], [.65, .79], [.35, .79], [.35, .36], [.42, .27], [.42, .13]), path([.42, .2], [.58, .2]), path([.36, .55], [.64, .55])],
  donut: [ellipse(.5, .5, .3, .29), ellipse(.5, .5, .11, .1), path([.29, .38], [.37, .43]), path([.61, .34], [.67, .4]), path([.63, .62], [.7, .57])],
  sandwich: [path([.2, .69], [.5, .22], [.8, .69], [.2, .69]), path([.25, .61], [.75, .61]), path([.3, .53], [.7, .53]), path([.36, .43], [.64, .43])],
  key: [ellipse(.3, .44, .15, .16), ellipse(.3, .44, .06, .06), path([.44, .5], [.78, .73]), path([.65, .64], [.72, .56]), path([.72, .69], [.79, .61])],
  glasses: [ellipse(.32, .49, .17, .16), ellipse(.68, .49, .17, .16), path([.49, .47], [.51, .47]), path([.15, .43], [.07, .34]), path([.85, .43], [.93, .34])],
  calculator: [rectangle(.28, .12, .44, .72), rectangle(.35, .2, .3, .16), rectangle(.35, .46, .09, .09), rectangle(.47, .46, .09, .09), rectangle(.59, .46, .09, .09), rectangle(.35, .59, .09, .09), rectangle(.47, .59, .09, .09), rectangle(.59, .59, .09, .22)],
  marker: [path([.24, .67], [.62, .27], [.74, .39], [.36, .79], [.24, .67]), path([.62, .27], [.69, .2], [.81, .32], [.74, .39]), path([.24, .67], [.18, .82], [.36, .79])],
  ruler: [path([.18, .63], [.68, .18], [.82, .35], [.32, .8], [.18, .63]), path([.33, .55], [.27, .48]), path([.43, .46], [.35, .36]), path([.53, .37], [.47, .3]), path([.63, .28], [.55, .19])],
  "desk-lamp": [ellipse(.48, .8, .22, .07), path([.48, .74], [.43, .5], [.59, .28]), path([.39, .51], [.47, .55]), path([.48, .31], [.68, .24], [.73, .42], [.55, .45], [.48, .31])],
  fan: [ellipse(.5, .42, .27, .28), ellipse(.5, .42, .05, .05), ellipse(.5, .27, .08, .16), ellipse(.63, .5, .15, .08), ellipse(.36, .5, .15, .08), path([.5, .7], [.5, .82]), path([.35, .82], [.65, .82])],
  elevator: [rectangle(.2, .14, .6, .7), path([.5, .14], [.5, .84]), path([.38, .27], [.45, .19], [.52, .27]), path([.62, .19], [.69, .27], [.76, .19])],
  stairs: [path([.17, .78], [.33, .78], [.33, .64], [.49, .64], [.49, .5], [.65, .5], [.65, .36], [.82, .36]), path([.22, .69], [.73, .22]), path([.66, .22], [.73, .22], [.73, .29])],
  door: [rectangle(.27, .12, .46, .72), ellipse(.63, .5, .03, .035), path([.21, .84], [.79, .84])],
  window: [rectangle(.19, .16, .62, .62), path([.5, .16], [.5, .78]), path([.19, .47], [.81, .47]), path([.15, .83], [.85, .83])],
  "coffee-machine": [rectangle(.24, .14, .52, .67), rectangle(.34, .22, .32, .16), path([.5, .38], [.5, .52]), path([.43, .52], [.57, .52]), rectangle(.38, .56, .24, .18), ellipse(.63, .65, .07, .07)],
  projector: [rectangle(.23, .35, .54, .28), ellipse(.62, .49, .1, .1), path([.27, .63], [.23, .76]), path([.73, .63], [.77, .76]), path([.62, .35], [.76, .14]), path([.72, .35], [.88, .23])],
  whiteboard: [rectangle(.18, .14, .64, .52), path([.27, .66], [.22, .84]), path([.73, .66], [.78, .84]), path([.31, .3], [.43, .4], [.56, .25], [.7, .45]), path([.28, .56], [.46, .56])],
  "meeting-room": [ellipse(.5, .58, .28, .13), ellipse(.26, .3, .06, .07), ellipse(.42, .25, .06, .07), ellipse(.58, .25, .06, .07), ellipse(.74, .3, .06, .07), rectangle(.14, .12, .72, .72)],
  "open-space": [rectangle(.12, .2, .3, .2), rectangle(.58, .2, .3, .2), rectangle(.12, .58, .3, .2), rectangle(.58, .58, .3, .2), path([.27, .4], [.27, .5]), path([.73, .4], [.73, .5])],
  "home-office": [path([.14, .43], [.5, .13], [.86, .43]), rectangle(.22, .43, .56, .4)].concat(screen(.34, .48, .32, .22)),
  handshake: [path([.12, .35], [.3, .29], [.48, .48], [.57, .43], [.76, .59], [.62, .73], [.43, .57], [.34, .62], [.12, .46], [.12, .35]), path([.88, .34], [.7, .28], [.52, .48]), path([.23, .53], [.34, .4]), path([.77, .52], [.66, .4])],
  presentation: [rectangle(.25, .12, .5, .43), path([.5, .55], [.5, .75]), path([.35, .75], [.65, .75]), path([.34, .45], [.45, .34], [.55, .39], [.68, .22])].concat(person(.16, .38, .72)),
  brainstorm: [ellipse(.5, .3, .13, .15), path([.43, .45], [.57, .45]), path([.45, .52], [.55, .52]), arc(.5, .62, .26, .16, Math.PI, Math.PI * 2, 14), ellipse(.33, .69, .07, .08), ellipse(.67, .69, .07, .08), path([.5, .15], [.5, .07]), path([.34, .2], [.27, .13]), path([.66, .2], [.73, .13])],
  "video-call": screen(.14, .13, .72, .57).concat([ellipse(.31, .3, .08, .09), ellipse(.69, .3, .08, .09), ellipse(.31, .53, .08, .09), ellipse(.69, .53, .08, .09)]),
  "lunch-break": [ellipse(.5, .49, .24, .23), ellipse(.5, .49, .13, .12), path([.18, .23], [.18, .74]), path([.13, .23], [.13, .43], [.23, .43], [.23, .23]), path([.82, .23], [.82, .74]), ellipse(.74, .2, .1, .11), path([.74, .2], [.74, .12]), path([.74, .2], [.81, .24])],
  vacation: [path([.5, .75], [.5, .34]), arc(.5, .42, .25, .2, Math.PI, Math.PI * 2, 12), path([.25, .42], [.38, .35], [.5, .42], [.62, .35], [.75, .42]), path([.5, .75], [.42, .83]), path([.5, .75], [.58, .83]), ellipse(.78, .2, .1, .11)],
  overtime: [ellipse(.35, .43, .21, .22), path([.35, .43], [.35, .27]), path([.35, .43], [.48, .5]), arc(.72, .35, .13, .14, .35 * Math.PI, 1.65 * Math.PI, 12), path([.75, .22], [.81, .17]), rectangle(.55, .59, .3, .2)],
  boss: person(.5, .25, 1).concat([path([.41, .18], [.45, .07], [.5, .16], [.55, .07], [.59, .18]), path([.47, .46], [.5, .55], [.53, .46])]),
  intern: person(.5, .22, 1).concat([path([.43, .39], [.5, .51], [.57, .39]), rectangle(.41, .48, .18, .16)], document(.68, .45, .18, .3)),
  team: person(.25, .29, .75).concat(person(.5, .2, .9), person(.75, .29, .75)),
  "office-dog": [ellipse(.46, .54, .25, .16), ellipse(.7, .43, .13, .14), path([.64, .33], [.61, .18], [.72, .31]), path([.76, .33], [.82, .2], [.82, .38]), path([.28, .54], [.15, .4], [.13, .3]), path([.34, .65], [.32, .81]), path([.56, .66], [.58, .81]), ellipse(.76, .45, .02, .02)],
  alarm: [ellipse(.5, .5, .25, .25), path([.5, .5], [.5, .32]), path([.5, .5], [.65, .57]), arc(.31, .25, .12, .1, Math.PI, Math.PI * 2, 8), arc(.69, .25, .12, .1, Math.PI, Math.PI * 2, 8), path([.36, .7], [.3, .82]), path([.64, .7], [.7, .82])],
  "fire-drill": [path([.38, .78], [.29, .63], [.36, .49], [.33, .35], [.47, .44], [.51, .18], [.65, .4], [.7, .55], [.62, .75], [.5, .82], [.38, .78]), path([.72, .23], [.88, .23], [.88, .45]), path([.78, .35], [.88, .45], [.78, .55])],
  wifi: [arc(.5, .66, .34, .4, 1.2 * Math.PI, 1.8 * Math.PI, 14), arc(.5, .66, .24, .28, 1.2 * Math.PI, 1.8 * Math.PI, 12), arc(.5, .66, .14, .16, 1.2 * Math.PI, 1.8 * Math.PI, 10), ellipse(.5, .68, .035, .04)],
  cloud: [path([.26, .68], [.72, .68]), arc(.36, .56, .16, .14, .9 * Math.PI, 1.9 * Math.PI, 10), arc(.51, .44, .2, .22, .9 * Math.PI, 1.85 * Math.PI, 12), arc(.68, .57, .15, .13, 1.05 * Math.PI, 2 * Math.PI, 10)],
  password: [rectangle(.22, .36, .56, .4), arc(.5, .38, .18, .23, Math.PI, Math.PI * 2, 12), path([.35, .53], [.4, .61], [.45, .53]), path([.5, .53], [.55, .61], [.6, .53]), path([.65, .53], [.7, .61], [.75, .53])],
  bug: [ellipse(.5, .52, .17, .25), path([.5, .27], [.5, .77]), path([.38, .35], [.29, .24]), path([.62, .35], [.71, .24]), path([.34, .45], [.18, .39]), path([.34, .57], [.18, .62]), path([.66, .45], [.82, .39]), path([.66, .57], [.82, .62])],
  rocket: [path([.5, .12], [.68, .39], [.62, .69], [.38, .69], [.32, .39], [.5, .12]), ellipse(.5, .39, .07, .08), path([.38, .58], [.24, .75], [.39, .71]), path([.62, .58], [.76, .75], [.61, .71]), path([.44, .7], [.5, .88], [.56, .7])],
  trophy: [path([.35, .18], [.65, .18], [.61, .48], [.5, .6], [.39, .48], [.35, .18]), arc(.34, .33, .16, .16, .5 * Math.PI, 1.5 * Math.PI, 10), arc(.66, .33, .16, .16, -.5 * Math.PI, .5 * Math.PI, 10), path([.5, .6], [.5, .74]), rectangle(.35, .74, .3, .1)],
  target: [ellipse(.5, .5, .32, .32), ellipse(.5, .5, .21, .21), ellipse(.5, .5, .09, .09), path([.83, .17], [.52, .48]), path([.83, .17], [.73, .18]), path([.83, .17], [.82, .27])],
  puzzle: [path([.25, .25], [.42, .25], [.42, .17], [.5, .11], [.58, .17], [.58, .25], [.75, .25], [.75, .43], [.83, .43], [.89, .51], [.83, .59], [.75, .59], [.75, .75], [.58, .75], [.58, .67], [.5, .61], [.42, .67], [.42, .75], [.25, .75], [.25, .57], [.33, .57], [.39, .49], [.33, .41], [.25, .41], [.25, .25]), path([.42, .25], [.42, .67]), path([.25, .49], [.75, .49])],
  lightbulb: [ellipse(.5, .38, .21, .24), path([.39, .56], [.43, .67], [.57, .67], [.61, .56]), path([.42, .72], [.58, .72]), path([.44, .78], [.56, .78]), path([.5, .08], [.5, .01]), path([.25, .18], [.18, .11]), path([.75, .18], [.82, .11])],
  chart: [path([.18, .16], [.18, .79], [.83, .79]), rectangle(.27, .58, .11, .21), rectangle(.46, .43, .11, .36), rectangle(.65, .25, .11, .54), path([.24, .48], [.42, .36], [.58, .39], [.78, .17])],
  money: [rectangle(.18, .25, .64, .42), ellipse(.5, .46, .13, .13), path([.24, .36], [.31, .3]), path([.69, .61], [.76, .55]), ellipse(.71, .73, .11, .1), ellipse(.79, .78, .1, .09)],
  mailbox: [path([.22, .35], [.63, .35], [.76, .45], [.76, .67], [.22, .67], [.22, .35]), arc(.63, .51, .13, .16, -.5 * Math.PI, .5 * Math.PI, 10), path([.4, .67], [.4, .84]), path([.25, .84], [.55, .84]), path([.31, .35], [.31, .2], [.48, .2], [.48, .35])],
  "copy-machine": [rectangle(.25, .31, .5, .4), rectangle(.32, .12, .36, .25), rectangle(.32, .62, .36, .22), path([.29, .43], [.71, .43]), path([.4, .25], [.6, .25])],
  server: [rectangle(.25, .12, .5, .72), path([.25, .32], [.75, .32]), path([.25, .52], [.75, .52]), path([.25, .72], [.75, .72]), ellipse(.65, .22, .025, .025), ellipse(.58, .22, .025, .025), ellipse(.65, .42, .025, .025), ellipse(.58, .42, .025, .025), ellipse(.65, .62, .025, .025)],
  usb: [path([.26, .31], [.6, .31], [.75, .46], [.75, .7], [.26, .7], [.26, .31]), rectangle(.6, .37, .22, .27), path([.68, .37], [.68, .5]), path([.75, .37], [.75, .5]), ellipse(.36, .51, .05, .05)],
  webcam: screen(.2, .27, .6, .39).concat([ellipse(.5, .21, .13, .1), ellipse(.5, .21, .055, .045)]),
  microphone: [path([.39, .19], [.39, .48], [.5, .59], [.61, .48], [.61, .19]), arc(.5, .45, .23, .25, 0, Math.PI, 12), path([.5, .7], [.5, .82]), path([.36, .82], [.64, .82]), path([.43, .3], [.57, .3]), path([.43, .4], [.57, .4])],
  bookshelf: [rectangle(.18, .12, .64, .72), path([.18, .47], [.82, .47]), rectangle(.23, .19, .1, .28), rectangle(.35, .24, .12, .23), rectangle(.5, .17, .09, .3), rectangle(.61, .22, .15, .25), rectangle(.24, .55, .16, .29), rectangle(.43, .59, .1, .25), rectangle(.56, .53, .17, .31)],
  couch: [path([.2, .43], [.28, .35], [.72, .35], [.8, .43], [.8, .74], [.2, .74], [.2, .43]), rectangle(.29, .43, .2, .2), rectangle(.51, .43, .2, .2), path([.2, .69], [.13, .58], [.13, .45], [.2, .42]), path([.8, .69], [.87, .58], [.87, .45], [.8, .42]), path([.28, .74], [.25, .84]), path([.72, .74], [.75, .84])],
  nameplate: [path([.35, .12], [.42, .3]), path([.65, .12], [.58, .3]), rectangle(.22, .3, .56, .32), path([.32, .44], [.68, .44]), path([.38, .53], [.62, .53])],
  cake: [rectangle(.25, .57, .5, .22), rectangle(.32, .39, .36, .18), path([.38, .39], [.38, .25]), path([.5, .39], [.5, .23]), path([.62, .39], [.62, .25]), path([.38, .25], [.35, .19], [.38, .14], [.41, .19], [.38, .25]), path([.5, .23], [.47, .17], [.5, .12], [.53, .17], [.5, .23]), path([.62, .25], [.59, .19], [.62, .14], [.65, .19], [.62, .25])],
  balloon: [ellipse(.5, .35, .22, .27), path([.47, .62], [.5, .69], [.53, .62]), path([.5, .69], [.44, .82], [.52, .9]), path([.38, .2], [.34, .29])],
  bicycle: [ellipse(.28, .66, .19, .19), ellipse(.72, .66, .19, .19), path([.28, .66], [.43, .38], [.58, .66], [.28, .66], [.5, .66], [.65, .38], [.72, .66]), path([.43, .38], [.61, .38]), path([.65, .38], [.62, .27]), path([.57, .28], [.68, .28]), path([.37, .33], [.48, .33])],
  taxi: [path([.16, .61], [.23, .41], [.37, .31], [.66, .31], [.78, .43], [.85, .61], [.85, .72], [.16, .72], [.16, .61]), ellipse(.31, .72, .1, .1), ellipse(.7, .72, .1, .1), path([.29, .42], [.72, .42]), rectangle(.43, .22, .18, .09)]
});

export const PICTIONARY_PROMPTS = Object.freeze([
  ["coffee", "Hrnek kávy"], ["printer", "Tiskárna"], ["chair", "Kancelářská židle"],
  ["plane", "Papírová vlaštovka"], ["calendar", "Kalendář"], ["laptop", "Notebook"],
  ["headphones", "Sluchátka"], ["plant", "Květina v kanceláři"], ["keyboard", "Klávesnice"],
  ["meeting", "Meeting"], ["email", "E-mail"], ["deadline", "Deadline"],
  ["stapler", "Sešívačka"], ["scissors", "Nůžky"], ["pencil", "Tužka"],
  ["paperclip", "Kancelářská sponka"], ["sticky-note", "Samolepicí lístek"], ["mouse", "Počítačová myš"],
  ["monitor", "Monitor"], ["phone", "Telefon"], ["clock", "Nástěnné hodiny"],
  ["trash-bin", "Odpadkový koš"], ["folder", "Složka na dokumenty"], ["briefcase", "Aktovka"],
  ["badge", "Firemní visačka"], ["charger", "Nabíječka"], ["umbrella", "Deštník"],
  ["bottle", "Láhev na vodu"], ["donut", "Kobliha"], ["sandwich", "Sendvič"],
  ["key", "Klíč"], ["glasses", "Brýle"], ["calculator", "Kalkulačka"],
  ["marker", "Fix"], ["ruler", "Pravítko"], ["desk-lamp", "Stolní lampička"],
  ["fan", "Ventilátor"], ["elevator", "Výtah"], ["stairs", "Schody"],
  ["door", "Dveře"], ["window", "Okno"], ["coffee-machine", "Kávovar"],
  ["projector", "Projektor"], ["whiteboard", "Bílá tabule"], ["meeting-room", "Zasedačka"],
  ["open-space", "Open space"], ["home-office", "Home office"], ["handshake", "Podání ruky"],
  ["presentation", "Prezentace"], ["brainstorm", "Brainstorming"], ["video-call", "Videohovor"],
  ["lunch-break", "Obědová pauza"], ["vacation", "Dovolená"], ["overtime", "Přesčas"],
  ["boss", "Šéf"], ["intern", "Stážista"], ["team", "Tým"],
  ["office-dog", "Kancelářský pes"], ["alarm", "Budík"], ["fire-drill", "Požární cvičení"],
  ["wifi", "Wi-Fi"], ["cloud", "Cloud"], ["password", "Heslo"],
  ["bug", "Chyba v systému"], ["rocket", "Raketa"], ["trophy", "Pohár"],
  ["target", "Terč"], ["puzzle", "Dílek puzzle"], ["lightbulb", "Žárovka"],
  ["chart", "Rostoucí graf"], ["money", "Peníze"], ["mailbox", "Poštovní schránka"],
  ["copy-machine", "Kopírka"], ["server", "Server"], ["usb", "USB flash disk"],
  ["webcam", "Webkamera"], ["microphone", "Mikrofon"], ["bookshelf", "Knihovna"],
  ["couch", "Kancelářský gauč"], ["nameplate", "Cedulka na dveřích"], ["cake", "Narozeninový dort"],
  ["balloon", "Balónek"], ["bicycle", "Kolo do práce"], ["taxi", "Taxi"]
].map(function ([id, label]) {
  return Object.freeze({ id, label });
}));

export const PICTIONARY_CONFUSABLE_GROUPS = Object.freeze([
  ["paper", ["printer", "copy-machine", "stapler", "paperclip", "sticky-note", "folder", "whiteboard", "plane"]],
  ["stationery", ["pencil", "marker", "ruler", "scissors", "stapler", "paperclip", "calculator"]],
  ["computer", ["laptop", "monitor", "keyboard", "mouse", "webcam", "charger", "usb", "server"]],
  ["communication", ["phone", "headphones", "microphone", "video-call", "email", "wifi", "webcam", "laptop"]],
  ["time", ["calendar", "clock", "alarm", "deadline", "overtime", "vacation", "meeting"]],
  ["furniture", ["chair", "couch", "desk-lamp", "fan", "plant", "bookshelf", "trash-bin"]],
  ["spaces", ["door", "window", "elevator", "stairs", "meeting-room", "open-space", "home-office"]],
  ["food", ["coffee", "coffee-machine", "bottle", "donut", "sandwich", "lunch-break", "cake"]],
  ["people", ["boss", "intern", "team", "handshake", "meeting", "presentation", "brainstorm", "office-dog"]],
  ["identity", ["briefcase", "badge", "nameplate", "key", "glasses", "folder", "mailbox"]],
  ["digital", ["cloud", "password", "bug", "server", "wifi", "email", "chart", "target"]],
  ["ideas", ["rocket", "trophy", "target", "puzzle", "lightbulb", "chart", "money", "balloon"]],
  ["travel", ["plane", "umbrella", "vacation", "mailbox", "balloon", "bicycle", "taxi"]],
  ["safety", ["fire-drill", "alarm", "door", "key", "umbrella", "trash-bin", "phone"]],
  ["workplace", ["home-office", "open-space", "meeting-room", "video-call", "meeting", "team", "office-dog"]],
  ["machines", ["printer", "copy-machine", "coffee-machine", "projector", "server", "monitor", "calculator", "phone"]]
].map(function ([id, prompts]) {
  return Object.freeze({ id, prompts: Object.freeze(prompts) });
}));

const PROMPT_IDS = new Set(PICTIONARY_PROMPTS.map(function (prompt) { return prompt.id; }));
const RELATED_PROMPTS = new Map(PICTIONARY_PROMPTS.map(function (prompt) {
  return [prompt.id, new Set()];
}));

PICTIONARY_CONFUSABLE_GROUPS.forEach(function (group) {
  if (group.prompts.length < 7 || new Set(group.prompts).size !== group.prompts.length
    || !group.prompts.every(function (promptId) { return PROMPT_IDS.has(promptId); })) {
    throw new TypeError("Neplatná skupina podobných Pictionary pojmů: " + group.id);
  }
  group.prompts.forEach(function (promptId) {
    group.prompts.forEach(function (relatedId) {
      if (relatedId !== promptId) RELATED_PROMPTS.get(promptId).add(relatedId);
    });
  });
});

PICTIONARY_PROMPTS.forEach(function (prompt) {
  if (RELATED_PROMPTS.get(prompt.id).size < 5) {
    throw new TypeError("Pictionary pojem nemá dost podobných chytáků: " + prompt.id);
  }
});

export function getPictionarySimilarPromptIds(promptId) {
  const related = RELATED_PROMPTS.get(promptId);
  return related ? Array.from(related) : [];
}

export function buildBotPictionaryPaths(promptId) {
  const drawing = BOT_DRAWINGS[promptId];
  if (!drawing) {
    return [ellipse(.5, .5, .25, .25), path([.38, .44], [.43, .4]), path([.62, .44], [.57, .4]), path([.38, .62], [.5, .69], [.62, .62])];
  }
  return drawing.map(function (points) {
    return points.map(function (point) { return point.slice(); });
  });
}
