/**
 * Information om kravavsnitt i EN 301 549 och WCAG 2.1.
 *
 * @license CC-BY 4.0
 */
export class EN301549Info {
  // Privata fält.
  static #EN301549Clauses = {
    5.2: [28, 'Activation of accessibility features'],
    5.3: [28, 'Biometrics'],
    5.4: [28, 'Preservation of accessibility information during conversion'],
    '5.5.1': [28, 'Means of operation'],
    '5.5.2': [29, 'Operable parts discernibility'],
    '5.6.1': [29, 'Tactile or auditory status'],
    '5.6.2': [29, 'Visual status'],
    5.7: [29, 'Key repeat'],
    5.8: [29, 'Double-strike key acceptance'],
    5.9: [29, 'Simultaneous user actions'],
    6.1: [30, 'Audio bandwidth for speech'],
    '6.2.1.1': [30, 'RTT communication'],
    '6.2.1.2': [30, 'Concurrent voice and text'],
    '6.2.2.1': [31, 'Visually distinguishable display'],
    '6.2.2.2': [31, 'Programmatically determinable send and receive direction'],
    '6.2.2.3': [31, 'Speaker identification'],
    '6.2.2.4': [31, 'Visual indicator of Audio with RTT'],
    '6.2.3': [31, 'Interoperability'],
    '6.2.4': [32, 'RTT responsiveness'],
    6.3: [32, 'Caller ID'],
    6.4: [32, 'Alternatives to voice-based services'],
    '6.5.2': [33, 'Resolution'],
    '6.5.3': [33, 'Frame rate'],
    '6.5.4': [33, 'Synchronization between audio and video'],
    '6.5.5': [33, 'Visual indicator of audio with video'],
    '6.5.6': [
      34,
      'Speaker identification with video (sign language) communication',
    ],
    '7.1.1': [35, 'Captioning playback'],
    '7.1.2': [35, 'Captioning synchronization'],
    '7.1.3': [35, 'Preservation of captioning'],
    '7.1.4': [35, 'Captions charactersitics'],
    '7.1.5': [35, 'Spoken subtitles'],
    '7.2.1': [36, 'Audio description playback'],
    '7.2.2': [36, 'Audio description synchronization'],
    '7.2.3': [36, 'Preservation of audio description'],
    7.3: [36, 'User controls for captions and audio description'],
    9.6: [51, 'WCAG conformance requirements'],
    '11.5.2.3': [79, 'Use of accessibility services'],
    '11.5.2.5': [79, 'Object information'],
    '11.5.2.6': [79, 'Row, columns, and headers'],
    '11.5.2.7': [80, 'Values'],
    '11.5.2.8': [80, 'Label relationships'],
    '11.5.2.9': [80, 'Parent-child relationships'],
    '11.5.2.10': [80, 'Text'],
    '11.5.2.11': [80, 'List of available actions'],
    '11.5.2.12': [80, 'Execution of available actions'],
    '11.5.2.13': [80, 'Tracking of focus and selection attributes'],
    '11.5.2.14': [81, 'Modification of focus and selection attributes'],
    '11.5.2.15': [81, 'Change notification'],
    '11.5.2.16': [81, 'Modifications of states and properties'],
    '11.5.2.17': [81, 'Modifications of values and text'],
    '11.6.2': [82, 'No disruption of accessibility features'],
    11.7: [82, 'User preferences'],
    '11.8.1': [82, 'Content technology'],
    '11.8.2': [82, 'Accessible content creation'],
    '11.8.3': [
      82,
      'Preservation of accessibility information in transformations',
    ],
    '11.8.4': [83, 'Repair assistance'],
    '11.8.5': [83, 'Templates'],
    '12.1.1': [84, 'Accessibility and compatibility features'],
    '12.1.2': [84, 'Accessible documentation'],
    '12.2.2': [84, 'Information on accessibility and compatibility features'],
    '12.2.3': [85, 'Effective communication'],
    '12.2.4': [85, 'Accessible documentation'],
  };

  static #EN301549Closed = {
    '11.1.1.1.2': 65,
    '11.1.2.1.2': 65,
    '11.1.2.3.2': 66,
    '11.1.3.2.2': 67,
    '11.1.3.5.2': 68,
    '11.1.4.4.2': 69,
    '11.1.4.5.2': 69,
    '11.2.1.1.2': 70,
    '11.2.1.4.2': 71,
    '11.3.1.1.2': 75,
    '11.3.3.1.2': 76,
  };

  static #WCAGClauses = {
    '1.1.1': ['A', 'Non-text Content'],
    '1.2.1': ['A', 'Audio-only and Video-only (Prerecorded)'],
    '1.2.2': ['A', 'Captions (Prerecorded)'],
    '1.2.3': ['A', 'Audio Description or Media Alternative (Prerecorded)'],
    '1.2.4': ['AA', 'Captions (Live)'],
    '1.2.5': ['AA', 'Audio Description (Prerecorded)'],
    '1.3.1': ['A', 'Info and Relationships'],
    '1.3.2': ['A', 'Meaningful Sequence'],
    '1.3.3': ['A', 'Sensory Characteristics'],
    '1.3.4': ['AA', 'Orientation'],
    '1.3.5': ['AA', 'Identify Input Purpose'],
    '1.4.1': ['A', 'Use of Color'],
    '1.4.2': ['A', 'Audio Control'],
    '1.4.3': ['AA', 'Contrast (Minimum)'],
    '1.4.4': ['AA', 'Resize Text'],
    '1.4.5': ['AA', 'Images of Text'],
    '1.4.10': ['AA', 'Reflow'],
    '1.4.11': ['AA', 'Non-text Contrast'],
    '1.4.12': ['AA', 'Text Spacing'],
    '1.4.13': ['AA', 'Content on Hover or Focus'],
    '2.1.1': ['A', 'Keyboard'],
    '2.1.2': ['A', 'No Keyboard Trap'],
    '2.1.4': ['A', 'Character Key Shortcuts'],
    '2.2.1': ['A', 'Timing Adjustable'],
    '2.2.2': ['A', 'Pause, Stop, Hide'],
    '2.3.1': ['A', 'Three Flashes or Below Threshold'],
    '2.4.1': ['A', 'Bypass Blocks'],
    '2.4.2': ['A', 'Page Titled'],
    '2.4.3': ['A', 'Focus Order'],
    '2.4.4': ['A', 'Link Purpose (in Context)'],
    '2.4.5': ['AA', 'Multiple Ways'],
    '2.4.6': ['AA', 'Headings and Labels'],
    '2.4.7': ['AA', 'Focus Visible'],
    '2.5.1': ['A', 'Pointer Gestures'],
    '2.5.2': ['A', 'Pointer Cancellation'],
    '2.5.3': ['A', 'Label in Name'],
    '2.5.4': ['AA', 'Motion Actuation'],
    '3.1.1': ['A', 'Language of Page'],
    '3.1.2': ['AA', 'Language of Parts'],
    '3.2.1': ['A', 'On Focus'],
    '3.2.2': ['A', 'On Input'],
    '3.2.3': ['AA', 'Consistent Navigation'],
    '3.2.4': ['AA', 'Consistent Identification'],
    '3.3.1': ['A', 'Error Identification'],
    '3.3.2': ['A', 'Labels or Instructions'],
    '3.3.3': ['AA', 'Error Suggestion'],
    '3.3.4': ['AA', 'Error Prevention (Legal, Financial, Data)'],
    '4.1.1': ['A', 'Parsing'],
    '4.1.2': ['A', 'Name, Role, Value'],
    '4.1.3': ['AA', 'Status Messages'],
  };

  static #URLs = {
    en301549:
      'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf',
    wcag: 'https://www.w3.org/TR/WCAG21/',
  };

  /**
   * Returnera information om angivet avsnitt.
   *
   * Returvärdet är ett objekt vars innehåll skiljer sig beroende på om av-
   * snittet ingår i WCAG eller inte.
   *
   * Gemensamma fält:
   * - clause Avsnittsnummer.
   * - title  Avsnittsrubrik.
   * - url    Länkadress.
   * - wcag   Ingår i WCAG (true/false)?
   *
   * Fält för avsnitt som ingår i WCAG:
   * - criterion Kriterienunmmer.
   * - level     Överensstämmelsenivå (A/AA).
   *
   * Fält för avsnitt som inte ingår i WCAG:
   * - functionality Typ av funktionalitet (open/closed/"").
   *
   * @param {string} num Avsnittsnummer, t ex "11.1.3.1.2".
   * @return {(object|null)}
   */
  static clause(num) {
    const id = (title) =>
      title
        ?.toLowerCase()
        .replaceAll(' ', '-')
        .replace(/[^\w-]/g, '');

    if (EN301549Info.isWCAG(num)) {
      const [, sc] = /^(?:9|10|11)\.(\d\.\d\.\d+)/.exec(num);
      const [level, title] = EN301549Info.#WCAGClauses[sc] ?? [];
      return {
        clause: num,
        criterion: sc,
        level,
        title,
        url: `${EN301549Info.#URLs.wcag}#${id(title)}`,
        wcag: true,
      };
    } else if (num in EN301549Info.#EN301549Clauses) {
      const [page, title] = EN301549Info.#EN301549Clauses[num] ?? [];
      const param = page ? `#page=${page}` : '';
      return {
        clause: num,
        functionality: '',
        title,
        url: `${EN301549Info.#URLs.en301549}${param}`,
        wcag: false,
      };
    } else if (/^11\.[1-4]\.\d\.\d+\.[12]$/.test(num)) {
      const [, sc, func] = /^11\.(\d\.\d\.\d+)\.([12])$/.exec(num);
      const [level, title] = EN301549Info.#WCAGClauses[sc] ?? [];
      if ('1' === func) {
        return {
          clause: num,
          criterion: sc,
          functionality: 'open',
          level,
          title,
          url: `${EN301549Info.#URLs.wcag}#${id(title)}`,
          wcag: true,
        };
      } else {
        const page = EN301549Info.#EN301549Closed[num] ?? [];
        return {
          clause: num,
          functionality: 'closed',
          title: title[0] + title.slice(1).toLowerCase(),
          url: `${EN301549Info.#URLs.en301549}#page=${page}`,
          wcag: false,
        };
      }
    }

    return null;
  }

  /**
   * Avgör om ett kravavsnitt finns i WCAG 2.1.
   *
   * @param {string} num Kravavsnittsnummer i EN 301 549.
   * @return {boolean}
   */
  static isWCAG(num) {
    return /^(9|10|11)\.[1-4]\.\d\.\d+$/.test(num);
  }
}
