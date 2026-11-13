/**
 * Generera en QR-kod i ett HTML-element.
 *
 * Klassen är baserad på kod som skapats för att vara kompatibel med gamla
 * webbläsare, men som inte fungerar i modulsammanhang. Eftersom anpassningen är
 * gjord för ES6 och moduler förutsätts att webbläsaren har stöd för canvas, så
 * alternativa renderingssätt (SVG/tabell) har fått utgå. Likaså koden för att
 * kringgå buggar i Android 2.1 och äldre.
 *
 * @example
 * const el = document.getElementById("test");
 * new QRCodeGenerator(el, "http://example.com");
 *
 * @example
 * const qr = new QRCodeGenerator("test", {
 *     text:   "http://example.com",
 *     width:  128,
 *     height: 128
 * });
 *
 * qr.clear();                              // Rensa QR-koden.
 * qr.makeCode("https://www.example.com");  // Skapa en ny QR-kod.
 *
 * @author Tommy Olsson
 * @author davidshimjs
 * @property {object} CorrectLevel Konstanter för felkorrigeringsnivå.
 */
export class QRCodeGenerator {
  // Privata fält.
  #drawing;
  #element;
  #options = {
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRErrorCorrectLevel.H,
    height: 256,
    typeNumber: 4,
    width: 256,
  };
  #qrCode;

  static limitLengths = [
    [17, 14, 11, 7],
    [32, 26, 20, 14],
    [53, 42, 32, 24],
    [78, 62, 46, 34],
    [106, 84, 60, 44],
    [134, 106, 74, 58],
    [154, 122, 86, 64],
    [192, 152, 108, 84],
    [230, 180, 130, 98],
    [271, 213, 151, 119],
    [321, 251, 177, 137],
    [367, 287, 203, 155],
    [425, 331, 241, 177],
    [458, 362, 258, 194],
    [520, 412, 292, 220],
    [586, 450, 322, 250],
    [644, 504, 364, 280],
    [718, 560, 394, 310],
    [792, 624, 442, 338],
    [858, 666, 482, 382],
    [929, 711, 509, 403],
    [1003, 779, 565, 439],
    [1091, 857, 611, 461],
    [1171, 911, 661, 511],
    [1273, 997, 715, 535],
    [1367, 1059, 751, 593],
    [1465, 1125, 805, 625],
    [1528, 1190, 868, 658],
    [1628, 1264, 908, 698],
    [1732, 1370, 982, 742],
    [1840, 1452, 1030, 790],
    [1952, 1538, 1112, 842],
    [2068, 1628, 1168, 898],
    [2188, 1722, 1228, 958],
    [2303, 1809, 1283, 983],
    [2431, 1911, 1351, 1051],
    [2563, 1989, 1423, 1093],
    [2699, 2099, 1499, 1139],
    [2809, 2213, 1579, 1219],
    [2953, 2331, 1663, 1273],
  ];

  /**
   * Konstruera en generatorinstans.
   *
   * @param {(HTMLElement|string)} element Element eller elementidentitet.
   * @param {(object|string)}      options Inställningar eller URL.
   * @param {string}               options.text           Data (t.ex. URL).
   * @param {number}               [options.width]        Bredd i pixel.
   * @param {number}               [options.height]       Höjd i pixel.
   * @param {string}               [options.colorDark]    Mörk färgkod.
   * @param {string}               [options.colorLight]   Ljus färgkod.
   * @param {number}               [options.correctLevel] Felkorrigeringsnivå.
   * @throws {TypeError} Inget giltigt element angivet.
   */
  constructor(element, options) {
    if ('string' === typeof options) {
      this.#options.text = options;
    } else if (options) {
      Object.assign(this.#options, options);
    }

    if ('string' === typeof element) {
      element = document.getElementById(element);
    }
    if (!element) {
      throw new TypeError('Inget giltigt element angivet för QR-kod.');
    }
    this.#element = element;
    this.#drawing = new Drawing(this.#element, this.#options);

    if (this.#options.text) {
      this.makeCode(this.#options.text);
    }
  }

  /**
   * Rensa QR-koden.
   */
  clear() {
    this.#drawing?.clear();
  }

  // Åtkomstmetod för felkorringeringskonstanter.
  get CorrectLevel() {
    return QRErrorCorrectLevel;
  }

  /**
   * Skapa QR-koden.
   *
   * @param {string} text Text (URL).
   */
  makeCode(text) {
    this.#qrCode = new QRCode(this.#version(text), this.#options.correctLevel);
    this.#qrCode.addData(text);
    this.#qrCode.make();
    this.#drawing.draw(this.#qrCode);
  }

  /**
   * Beräkna QR-version baserat på datasträngens längd.
   *
   * Versionen styr hur många punkter QR-koden består av. Tillsammans med fel-
   * korrigeringsnivån avgör det hur mycket data som kan representeras av
   * koden. För en given datasträng och felkorringeringsnivå går det alltså
   * att räkna ut hur hög version som behövs för att representera strängen som
   * en QR-kod.
   *
   * Antal punkter per sida = 4V + 17, där V är versionsnumret (1-40).
   *
   * @private
   * @param {string} text Text som ska rymmas.
   * @return {number} QR-version.
   */
  #version(text) {
    const index = {
      [QRErrorCorrectLevel.L]: 0,
      [QRErrorCorrectLevel.M]: 1,
      [QRErrorCorrectLevel.Q]: 2,
      [QRErrorCorrectLevel.H]: 3,
    }[this.#options.correctLevel];
    const length = QRCodeGenerator.#utf8Length(text);
    let type = 1;

    for (const lengths of QRCodeGenerator.limitLengths) {
      if (length <= lengths[index]) break;
      ++type;
    }

    return type;
  }

  /**
   * Returnera antalet bytes i en stäng kodad som UTF-8.
   *
   * Metoden använder `encodeURI()`, som kodar en sträng som UTF-8, med icke-
   * ASCII-tecken och specialtecken skyddade som "%xx" (2 hexsiffror). Genom
   * att ersätta varje sådan grupp går det alltså att mäta stränglängden.
   *
   * @private
   * @param {string} text Sträng att mäta längden på.
   * @return {number} Antalet byte i strängen om den kodas som UTF-8.
   */
  static #utf8Length(text) {
    const encoded = encodeURI(text).replace(/%[0-9a-f]{2}/gi, 'x');
    return encoded.length + (encoded != text ? 3 : 0); // BOM
  }
}

/**
 * Rita en QR-kod på ett `canvas`-element.
 *
 * Anpassad till ES6/moduler. Originalkoden skapar ett `img`-element från en
 * data-URL genererad av `canvas`-elementet och visar bilden i stället för
 * `canvas`-elementet. Det förefaller helt onödigt och har därför tagits bort.
 *
 * @license CC-BY 4.0
 * @author Tommy Olsson
 * @author davidshimjs
 */
class Drawing {
  // Privata fält.
  #canvas;
  #options;
  #painted = false;
  #parent;

  /**
   * Konstruera en ritningsinstans.
   *
   * @see QRCodeGenerator
   * @param {HTMLElement} parent  Element att infoga `canvas` i.
   * @param {object}      options Generatorinställningar.
   */
  constructor(parent, options) {
    this.#parent = parent;
    this.#options = options;

    this.#canvas = document.createElement('canvas');
    this.#canvas.width = options.width;
    this.#canvas.height = options.height;
    parent.appendChild(this.#canvas);
  }

  /**
   * Rensa `canvas`-elementet.
   */
  clear() {
    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#painted = false;
  }

  /**
   * Rita en QR-kod på `canvas`-elementet.
   *
   * @param {QRCode} qrCode QR-kod att rita.
   */
  draw(qrCode) {
    const ctx = this.#canvas.getContext('2d');
    const moduleCount = qrCode.moduleCount;
    const height = this.#options.height / moduleCount;
    const width = this.#options.width / moduleCount;

    this.clear();

    for (let row = 0; row < moduleCount; ++row) {
      for (let col = 0; col < moduleCount; ++col) {
        const dark = qrCode.isSet(row, col);
        const colour = this.#options[dark ? 'colorDark' : 'colorLight'];
        const left = col * width;
        const top = row * height;

        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.fillStyle = colour;
        ctx.fillRect(left, top, width, height);

        // Skydd mot anti-aliasing.
        ctx.strokeRect(
          Math.floor(left) + 0.5,
          Math.floor(top) + 0.5,
          Math.round(width),
          Math.round(height)
        );
        ctx.strokeRect(
          Math.floor(left) - 0.5,
          Math.floor(top) - 0.5,
          Math.round(width),
          Math.round(height)
        );
      }
    }

    this.#painted = true;
  }
}

/**
 * Bitbuffert.
 *
 * Bufferten består av packade bitar, som läses och skrives som booleska flaggor
 * (`true` för 1 och `false` för 0).
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 * @property {number[]} buffer Buffert.
 * @property {number}   length Buffertlängd (bitar).
 */
class QRBitBuffer {
  // Privata fält.
  #buffer = [];
  #length = 0;

  // Åtkomstmetod för buffert.
  get buffer() {
    return this.#buffer;
  }

  /**
   * Returnera bitvärdet i angivet index.
   *
   * @param {number} index Index.
   * @return {boolean} `true` om värdet är "satt", annars `false`.
   */
  get(index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.#buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  // Åtkomstmetod för buffertlängd.
  get length() {
    return this.#length;
  }

  /**
   * Lägger till angivet antal bitar i bufferten från ett numeriskt värde.
   *
   * @param {number} num    Numeriskt värde att hämta bitar ifrån.
   * @param {number} length Antal bitar att hämta.
   */
  put(num, length) {
    for (let i = 0; i < length; ++i) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  /**
   * Lägger till en bit sist i bufferten.
   *
   * @param {boolean} bit `true` för att lägga till en 1:a, `false` för 0:a.
   */
  putBit(bit) {
    const bufIndex = Math.floor(this.#length / 8);
    if (this.#buffer.length <= bufIndex) {
      this.#buffer.push(0);
    }
    if (bit) {
      this.#buffer[bufIndex] |= 0x80 >>> this.#length % 8;
    }
    ++this.#length;
  }
}

/**
 * Representation av en QR-kod.
 *
 * Anpassad till ES6/moduler.
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 * @property {number} moduleCount Antal datapunkter per sida.
 */
class QRCode {
  // Privata fält.
  #dataCache;
  #dataList = [];
  #errorCorrectLevel;
  #moduleCount = 0;
  #modules;
  #typeNumber;

  static #PAD0 = 0xec;
  static #PAD1 = 0x11;

  /**
   * Konstruera en QR-kodinstans.
   *
   * @param {number} typeNumber        QR-version.
   * @param {number} errorCorrectLevel Felkorrigeringsnivå.
   */
  constructor(typeNumber, errorCorrectLevel) {
    this.#typeNumber = typeNumber;
    this.#errorCorrectLevel = errorCorrectLevel;
  }

  /**
   * Lägg till data.
   *
   * @param {string} data Datasträng att lägga till.
   */
  addData(data) {
    this.#dataList.push(new QREncodedData(data));
    this.#dataCache = null;
  }

  /**
   * Avgör om angiven koordinat är "tänd".
   *
   * @param {number} row Radnummer.
   * @param {number} col Kolumnnummer.
   * @return {boolean} `true` om punkten är "tänd", annars `false`.
   * @throws {RangeError} Om rad- eller kolumnnummer ligger utanför matrisen.
   */
  isSet(row, col) {
    const invalid = (c) => c < 0 || this.#moduleCount <= c;
    if (invalid(row) || invalid(col)) {
      throw new RangeError(`Ogiltig punkt (${row}, ${col}).`);
    }
    return this.#modules[row][col];
  }

  /**
   * Populera modulmatrisen.
   */
  make() {
    this.#make(false, this.#bestMaskPattern());
  }

  // Åtkomstmetod för antalet datapunkter per sida.
  get moduleCount() {
    return this.#moduleCount;
  }

  /**
   * Avgör vilket maskmönster som är optimalt.
   *
   * Generera en modulmatris för vart och ett av de 8 maskmönstren och välj
   * sedan det mönster där så få punkter som möjligt går förlorade.
   *
   * @private
   * @return {number}
   */
  #bestMaskPattern() {
    let minLostPoint = 0;
    let pattern = 0;

    for (let i = 0; i < 8; ++i) {
      this.#make(true, i);
      const lostPoint = QRUtil.countLostPoints(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  }

  /**
   * Skapa koddatavektor.
   *
   * @private
   * @param {QRBitBuffer} buffer   BESKRIVNING
   * @param {*}           rsBlocks BESKRIVNING
   * @return {number[]}
   */
  static #createBytes(buffer, rsBlocks) {
    const dcdata = new Array(rsBlocks.length);
    const ecdata = new Array(rsBlocks.length);
    let maxDcCount = 0;
    let maxEcCount = 0;
    let offset = 0;

    for (const [r, block] of rsBlocks.entries()) {
      const dcCount = block.dataCount;
      const ecCount = block.totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; ++i) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.errorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.length - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.length - 1);
      for (let i = 0; i < ecdata[r].length; ++i) {
        const modIndex = i + modPoly.length - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    const totalCodeCount = rsBlocks.reduce((a, b) => a + b.totalCount, 0);
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; ++i) {
      for (let r = 0; r < rsBlocks.length; ++r) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }

    for (let i = 0; i < maxEcCount; ++i) {
      for (let r = 0; r < rsBlocks.length; ++r) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  }

  /**
   * Skapa koddata.
   *
   * @private
   * @param {number}        typeNumber        QR-version.
   * @param {number}        errorCorrectLevel Felkorrigeringsnivå.
   * @param {EncodedData[]} dataList          Dataoktetter.
   * @return {number[]}
   * @throws {Error}
   */
  static #createData(typeNumber, errorCorrectLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();

    for (const data of dataList) {
      const length = QRUtil.lengthInBits(data.mode, typeNumber);
      buffer.put(data.mode, 4);
      buffer.put(data.length, length);
      data.write(buffer);
    }

    const totalDataCount = rsBlocks.reduce((a, b) => a + b.dataCount, 0);

    if (buffer.length > totalDataCount * 8) {
      throw new Error(
        `Code length overflow: (${buffer.length}` + `>${totalDataCount * 8}).`
      );
    }

    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.length % 8 != 0) {
      buffer.putBit(false);
    }

    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(QRCode.#PAD0, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(QRCode.#PAD1, 8);
    }

    return QRCode.#createBytes(buffer, rsBlocks);
  }

  /**
   * Populera modulmatrisen (implementation).
   *
   * @private
   * @param {boolean} test        Testflagga.
   * @param {number}  maskPattern Maskmönster att använda.
   */
  #make(test, maskPattern) {
    this.#moduleCount = this.#typeNumber * 4 + 17;
    this.#modules = new Array(this.#moduleCount);
    for (let r = 0; r < this.#moduleCount; ++r) {
      this.#modules[r] = new Array(this.#moduleCount).fill(null);
    }

    this.#setupPositionProbePattern(0, 0);
    this.#setupPositionProbePattern(this.#moduleCount - 7, 0);
    this.#setupPositionProbePattern(0, this.#moduleCount - 7);
    this.#setupPositionAdjustPattern();
    this.#setupTimingPattern();
    this.#setupTypeInfo(test, maskPattern);
    if (this.#typeNumber >= 7) {
      this.#setupTypeNumber(test);
    }
    this.#dataCache ??= QRCode.#createData(
      this.#typeNumber,
      this.#errorCorrectLevel,
      this.#dataList
    );
    this.#mapData(this.#dataCache, maskPattern);
  }

  /**
   * Infoga koddata i modulmatrisen.
   *
   * @private
   * @param {number[]} data        Koddatavektor.
   * @param {number}   maskPattern Maskmönster att anväNda.
   */
  #mapData(data, maskPattern) {
    let bitIndex = 7;
    let byteIndex = 0;
    let inc = -1;
    let row = this.#moduleCount - 1;

    for (let col = this.#moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) --col;
      while (true) {
        for (let c = 0; c < 2; ++c) {
          if (this.#modules[row][col - c] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            const mask = QRUtil.mask(maskPattern, row, col - c);
            if (mask) {
              dark = !dark;
            }
            this.#modules[row][col - c] = dark;
            --bitIndex;
            if (-1 === bitIndex) {
              ++byteIndex;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.#moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  /**
   * Skapa mönster för positionsjustering.
   *
   * Mönstret är en mindre version av mönstret positionsigenkänning. Place-
   * ringen beror på QR-versionen.
   *
   * @private
   */
  #setupPositionAdjustPattern() {
    const pos = QRUtil.patternPosition(this.#typeNumber);
    for (let i = 0; i < pos.length; ++i) {
      for (let j = 0; j < pos.length; ++j) {
        const row = pos[i];
        const col = pos[j];
        if (this.#modules[row][col] != null) continue;
        for (let r = -2; r <= 2; ++r) {
          for (let c = -2; c <= 2; ++c) {
            this.#modules[row + r][col + c] =
              r === -2 ||
              r === 2 ||
              c === -2 ||
              c === 2 ||
              (r === 0 && c === 0);
          }
        }
      }
    }
  }

  /**
   * Skapa mönster för positionsigenkänning.
   *
   * Mönstret består av en kvadrat med en fylld kvadrat inuti.
   *
   * @private
   * @param {number} row Radnummer för övre vänstra hörnet.
   * @param {number} col Kolumnnummer för övre vänstra hörnet.
   */
  #setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; ++r) {
      if (row + r <= -1 || this.#moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; ++c) {
        if (col + c <= -1 || this.#moduleCount <= col + c) continue;
        this.#modules[row + r][col + c] =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  /**
   * Skapa mönster för tidsbestämning.
   *
   * Mönstret består av en rad och en kolumn med alternerande mörka och ljusa
   * punkter.
   *
   * @private
   */
  #setupTimingPattern() {
    for (var n = 8; n < this.#moduleCount - 8; ++n) {
      if (this.#modules[n][6] == null) {
        this.#modules[n][6] = n % 2 === 0;
      }
      if (this.#modules[6][n] == null) {
        this.#modules[6][n] = n % 2 === 0;
      }
    }
  }

  /**
   * Infoga formatinformation.
   *
   * @private
   * @param {boolean} test        Testflagga.
   * @param {number}  maskPattern Maskmönster att använda.
   */
  #setupTypeInfo(test, maskPattern) {
    const data = (this.#errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.bchTypeInfo(data);

    for (let n = 0; n < 15; ++n) {
      var mod = !test && ((bits >> n) & 1) === 1;

      if (n < 6) {
        this.#modules[n][8] = mod;
      } else if (n < 8) {
        this.#modules[n + 1][8] = mod;
      } else {
        this.#modules[this.#moduleCount - 15 + n][8] = mod;
      }

      if (n < 8) {
        this.#modules[8][this.#moduleCount - n - 1] = mod;
      } else if (n < 9) {
        this.#modules[8][15 - n] = mod;
      } else {
        this.#modules[8][14 - n] = mod;
      }
    }
    this.#modules[this.#moduleCount - 8][8] = !test;
  }

  /**
   * Infoga QR-versionsinformation.
   *
   * @private
   * @param {boolean} test Testflagga.
   */
  #setupTypeNumber(test) {
    var bits = QRUtil.bchTypeNumber(this.#typeNumber);
    for (let n = 0; n < 18; ++n) {
      const mod = !test && ((bits >> n) & 1) === 1;
      const a = Math.floor(n / 3);
      const b = (n % 3) + this.#moduleCount - 8 - 3;
      this.#modules[a][b] = mod;
      this.#modules[b][a] = mod;
    }
  }
}

/**
 * Matematikhjälpfunktioner.
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 */
class QRMath {
  // Privata fält.
  static #EXP_TABLE = new Array(256);
  static {
    for (let i = 0; i < 8; ++i) {
      QRMath.#EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; ++i) {
      QRMath.#EXP_TABLE[i] =
        QRMath.#EXP_TABLE[i - 4] ^
        QRMath.#EXP_TABLE[i - 5] ^
        QRMath.#EXP_TABLE[i - 6] ^
        QRMath.#EXP_TABLE[i - 8];
    }
  }

  static #LOG_TABLE = new Array(256);
  static {
    for (let i = 0; i < 255; ++i) {
      QRMath.#LOG_TABLE[QRMath.#EXP_TABLE[i]] = i;
    }
  }

  /**
   * TITEL
   *
   * @param {number} n BESKRIVNING
   * @return {number}
   */
  static gexp(n) {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return QRMath.#EXP_TABLE[n];
  }

  /**
   * TITEL
   *
   * @param {number} n BESKRIVNING
   * @return {number}
   * @throws {RangeError} Om n<1.
   */
  static glog(n) {
    if (n < 1) {
      throw new RangeError(`Invalid value: n=${n}.`);
    }
    return QRMath.#LOG_TABLE[n];
  }
}

/**
 * En numeriskt kodad datavektor som representerar en UTF-8-kodad sträng.
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 * @property {mode}   mode   Datatyp.
 * @property {number} length Vektorlängd.
 */
class QREncodedData {
  // Privata fält.
  #data;
  #mode = QRMode.MODE_8BIT_BYTE;
  #octets = [];

  /**
   * Konstruera en datavektorinstans.
   *
   * @param {string} data Datasträng att koda.
   */
  constructor(data) {
    this.#data = data;

    for (const ch of data) {
      const byteArray = [];
      const code = ch.charCodeAt(0);

      if (code > 0x10000) {
        byteArray[0] = 0xf0 | ((code & 0x1c0000) >>> 18);
        byteArray[1] = 0x80 | ((code & 0x3f000) >>> 12);
        byteArray[2] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[3] = 0x80 | (code & 0x3f);
      } else if (code > 0x800) {
        byteArray[0] = 0xe0 | ((code & 0xf000) >>> 12);
        byteArray[1] = 0x80 | ((code & 0xfc0) >>> 6);
        byteArray[2] = 0x80 | (code & 0x3f);
      } else if (code > 0x80) {
        byteArray[0] = 0xc0 | ((code & 0x7c0) >>> 6);
        byteArray[1] = 0x80 | (code & 0x3f);
      } else {
        byteArray[0] = code;
      }

      this.#octets.push(byteArray);
    }

    this.#octets = this.#octets.flat();

    if (this.#octets.length !== this.#data.length) {
      this.#octets.unshift(191, 187, 239); // BOM
    }
  }

  // Åtkomstmetod för vektorlängd.
  get length() {
    return this.#octets.length;
  }

  // Åtkomstmetod för datatyp.
  get mode() {
    return this.#mode;
  }

  /**
   * Skriv vektorvärdena till en bitbuffert.
   *
   * @param {QRBitBuffer} buffer Buffert att skriva till.
   */
  write(buffer) {
    for (const octet of this.#octets) {
      buffer.put(octet, 8);
    }
  }
}

/**
 * TITEL
 *
 * BESKRIVNING
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 * @property {number} length Polynomvektorns längd.
 */
class QRPolynomial {
  // Privata fält.
  #num;

  /**
   * Konstruera en polynominstans.
   *
   * @param {number[]} num     BESKRIVNING
   * @param {number}   [shift] BESKRIVNING
   * @throws {TypeError} Första argumentet är inte en vektor.
   */
  constructor(num, shift = 0) {
    if (num.length == undefined) {
      throw new TypeError('Argument #1 to QRPolynomial() must be array.');
    }

    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      ++offset;
    }

    this.#num = num.slice(offset);
    this.#num.length = num.length - offset + shift;
  }

  /**
   * TITEL
   *
   * @param {number} index Index.
   * @return {number}
   */
  get(index) {
    return this.#num[index];
  }

  // Åtkomstmetod för vektorlängd.
  get length() {
    return this.#num.length;
  }

  /**
   * TITEL
   *
   * @param {QRPolynomial} e BESKRIVNING
   * @return {QRPolynomial}
   */
  mod(e) {
    if (this.length - e.length < 0) {
      return this;
    }

    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.length);
    for (let i = 0; i < this.length; ++i) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.length; ++i) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }

    return new QRPolynomial(num).mod(e);
  }

  /**
   * TITEL
   *
   * @param {QRPolynomial} e BESKRIVNING
   * @return {QRPolynomial}
   */
  multiply(e) {
    const num = new Array(this.length + e.length - 1);
    for (let i = 0; i < this.length; ++i) {
      for (let j = 0; j < e.length; ++j) {
        num[i + j] ^= QRMath.gexp(
          QRMath.glog(this.get(i)) + QRMath.glog(e.get(j))
        );
      }
    }
    return new QRPolynomial(num);
  }
}

/**
 * TITEL
 *
 * BESKRIVNING
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 * @property {number} dataCount  BESKRIVNING
 * @property {number} totalCount BESKRIVNING
 */
class QRRSBlock {
  // Privata fält.
  static #blockTable = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];

  #dataCount;
  #totalCount;

  /**
   * Konstruera en RS-blockinstans.
   *
   * @param {number} totalCount BESKRIVNING
   * @param {number} dataCount  BESKRIVNING
   */
  constructor(totalCount, dataCount) {
    this.#totalCount = totalCount;
    this.#dataCount = dataCount;
  }

  // Åtkomstmetod för BESKRIVNING.
  get dataCount() {
    return this.#dataCount;
  }

  /**
   * TITEL
   *
   * @param {number} typeNumber        QR-version.
   * @param {number} errorCorrectLevel Felkorrigeringsnivå.
   * @return {QRRSBlock[]}
   * @throws {TypeError}
   */
  static getRSBlocks(typeNumber, errorCorrectLevel) {
    const rsBlock = QRRSBlock.#rsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == undefined) {
      throw new TypeError(
        `Bad RS block @ typeNumber: ${typeNumber}/` +
          `errorCorrectLevel: ${errorCorrectLevel}.`
      );
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; ++i) {
      const count = rsBlock[i * 3];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; ++j) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }

    return list;
  }

  // Åtkomstmetod för BESKRIVNING.
  get totalCount() {
    return this.#totalCount;
  }

  /**
   * TITEL
   *
   * @param {number} typeNumber        QR-version.
   * @param {number} errorCorrectLevel Felkorrigeringsnivå.
   * @return {QRRSBlock[]}
   */
  static #rsBlockTable(typeNumber, errorCorrectLevel) {
    const offset = {
      [QRErrorCorrectLevel.L]: 0,
      [QRErrorCorrectLevel.M]: 1,
      [QRErrorCorrectLevel.Q]: 2,
      [QRErrorCorrectLevel.H]: 3,
    }[errorCorrectLevel];

    return QRRSBlock.#blockTable[(typeNumber - 1) * 4 + offset];
  }
}

/**
 * Hjälpfunktioner för QR-koder.
 *
 * @license MIT
 * @author Tommy Olsson
 * @author Kazuhiko Arase
 */
class QRUtil {
  // Privata fält.
  static #G15 = 0x537;
  static #G15_MASK = 0x5412;
  static #G18 = 0x1f25;

  static #patternPositions = Object.freeze([
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ]);

  /**
   * Returnera bitmönster för formatinformation.
   *
   * @param {number} data Formatinformation (felkorringeringsnivå + mask).
   * @return {number}
   */
  static bchTypeInfo(data) {
    let d = data << 10;
    while (QRUtil.#bchDigit(d) - QRUtil.#bchDigit(QRUtil.#G15) >= 0) {
      d ^= QRUtil.#G15 << (QRUtil.#bchDigit(d) - QRUtil.#bchDigit(QRUtil.#G15));
    }

    return ((data << 10) | d) ^ QRUtil.#G15_MASK;
  }

  /**
   * Returnera bitmönster för QR-versionsinformation.
   *
   * @param {number} data QR-version [1,40].
   * @return {number}
   */
  static bchTypeNumber(data) {
    let d = data << 12;
    while (QRUtil.#bchDigit(d) - QRUtil.#bchDigit(QRUtil.#G18) >= 0) {
      d ^= QRUtil.#G18 << (QRUtil.#bchDigit(d) - QRUtil.#bchDigit(QRUtil.#G18));
    }

    return (data << 12) | d;
  }

  /**
   * Räkna antalet förlorade punkter efter tillämpning av maskmönster.
   *
   * @param {QRCode} qrCode QR-kod.
   * @return {*}
   */
  static countLostPoints(qrCode) {
    let lost = 0;
    const moduleCount = qrCode.moduleCount;

    for (let row = 0; row < moduleCount; ++row) {
      for (let col = 0; col < moduleCount; ++col) {
        const dark = qrCode.isSet(row, col);
        let same = 0;
        for (let r = -1; r <= 1; ++r) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; ++c) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isSet(row + r, col + c)) {
              ++same;
            }
          }
        }
        if (same > 5) {
          lost += 3 + same - 5;
        }
      }
    }

    for (let row = 0; row < moduleCount - 1; ++row) {
      for (let col = 0; col < moduleCount - 1; ++col) {
        let count = 0;
        if (qrCode.isSet(row, col)) ++count;
        if (qrCode.isSet(row + 1, col)) ++count;
        if (qrCode.isSet(row, col + 1)) ++count;
        if (qrCode.isSet(row + 1, col + 1)) ++count;
        if (count === 0 || count === 4) {
          lost += 3;
        }
      }
    }

    for (let row = 0; row < moduleCount; ++row) {
      for (let col = 0; col < moduleCount - 6; ++col) {
        if (
          qrCode.isSet(row, col) &&
          !qrCode.isSet(row, col + 1) &&
          qrCode.isSet(row, col + 2) &&
          qrCode.isSet(row, col + 3) &&
          qrCode.isSet(row, col + 4) &&
          !qrCode.isSet(row, col + 5) &&
          qrCode.isSet(row, col + 6)
        ) {
          lost += 40;
        }
      }
    }

    for (let col = 0; col < moduleCount; ++col) {
      for (let row = 0; row < moduleCount - 6; ++row) {
        if (
          qrCode.isSet(row, col) &&
          !qrCode.isSet(row + 1, col) &&
          qrCode.isSet(row + 2, col) &&
          qrCode.isSet(row + 3, col) &&
          qrCode.isSet(row + 4, col) &&
          !qrCode.isSet(row + 5, col) &&
          qrCode.isSet(row + 6, col)
        ) {
          lost += 40;
        }
      }
    }

    let setCount = 0;
    for (let col = 0; col < moduleCount; ++col) {
      for (let row = 0; row < moduleCount; ++row) {
        if (qrCode.isSet(row, col)) {
          ++setCount;
        }
      }
    }

    const ratio =
      Math.abs((100 * setCount) / moduleCount / moduleCount - 50) / 5;
    lost += ratio * 10;
    return lost;
  }

  /**
   * Skapa polynom för felkorrigering.
   *
   * @param {number} errorCorrectLength BESKRIVNING
   * @return {*}
   */
  static errorCorrectPolynomial(errorCorrectLength) {
    let a = new QRPolynomial([1]);
    for (let i = 0; i < errorCorrectLength; ++i) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)]));
    }
    return a;
  }

  /**
   * TITEL
   *
   * @param {number} mode Datatyp.
   * @param {number} type QR-version.
   * @return {number}
   * @throws {TypeError} Ogiltig datatyp eller QR-version.
   */
  static lengthInBits(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw new TypeError(`Bad mode: ${mode}.`);
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw new TypeError(`Bad mode: ${mode}.`);
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw new TypeError(`Bad mode: ${mode}.`);
      }
    } else {
      throw new TypeError(`Bad type: ${type}.`);
    }
  }

  /**
   * Returnera huruvida en viss punkt är "satt" i ett maskmönster.
   *
   * @see {@link https://en.wikipedia.org/wiki/QR_code#/media/File:QR_Format_Information.svg}
   * @param {number} maskPattern Maskmönster.
   * @param {number} i           i-parameter.
   * @param {number} j           j-parameter.
   * @return {boolean}
   * @throws {TypeError} Ogiltigt maskmönster.
   */
  static mask(maskPattern, i, j) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001:
        return i % 2 === 0;
      case QRMaskPattern.PATTERN010:
        return j % 3 === 0;
      case QRMaskPattern.PATTERN011:
        return (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101:
        return ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        throw new TypeError(`Bad maskPattern: ${maskPattern}`);
    }
  }

  /**
   * Returnera mönsterpositioner för angiven QR-version.
   *
   * @param {number} typeNumber QR-version [1,40].
   * @return {number[]}
   */
  static patternPosition(typeNumber) {
    return QRUtil.#patternPositions[typeNumber - 1];
  }

  /**
   * Returnera antal signifikanta bitar för ett siffervärde.
   *
   * @param {number} data Siffervärde.
   * @return {number}
   */
  static #bchDigit(data) {
    var digits = 0;
    while (data != 0) {
      ++digits;
      data >>>= 1;
    }
    return digits;
  }
}

// Konstanter för felkorrigeringsnivå.
const QRErrorCorrectLevel = Object.freeze({
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
});

// Konstanter för maskmönster.
const QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7,
};

// Konstanter för datatyp (input mode).
const QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3,
};
