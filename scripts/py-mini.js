/*!
 * py-mini.js — a tiny Python-subset interpreter for classroom "ลองเขียนดู!" playgrounds.
 * Supports: variables, arithmetic, strings, f-strings, if/elif/else, for (range/list/enumerate),
 * while, def/return with default args & kwargs, lists, basic string/list methods, print(), input()
 * (via window.prompt), int()/float()/str()/len()/range()/enumerate()/abs()/round()/max()/min()/sum().
 * Not a real Python — a small, safe, sandboxed teaching interpreter with runaway-loop protection.
 */
(function (global) {
  'use strict';

  var MAX_STEPS = 60000;
  var MAX_OUTPUT_LINES = 400;
  var MAX_CALL_DEPTH = 150;

  /* ─────────────────── errors & control-flow signals ─────────────────── */
  function PyError(msg) { this.message = msg; this.isPyError = true; }
  PyError.prototype = Object.create(Error.prototype);

  function BreakSignal() {}
  function ContinueSignal() {}
  function ReturnSignal(value) { this.value = value; }
  function StopSignal() { this.__pyStop = true; }

  /* ─────────────────── helpers ─────────────────── */
  function pyStr(v) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    return String(v);
  }
  function pyRepr(v) {
    if (typeof v === 'string') return "'" + v + "'";
    return pyStr(v);
  }
  function _unescape(ch) {
    switch (ch) {
      case 'n': return '\n';
      case 't': return '\t';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      default: return ch;
    }
  }
  function stripComment(line) {
    var out = '', inStr = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (inStr) {
        out += c;
        if (c === '\\') { i++; if (i < line.length) out += line[i]; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'") { inStr = c; out += c; continue; }
      if (c === '#') break;
      out += c;
    }
    return out;
  }

  /* ─────────────────── tokenizer (per logical line) ─────────────────── */
  var KEYWORDS = ['if', 'elif', 'else', 'for', 'in', 'while', 'def', 'return', 'break', 'continue', 'pass', 'and', 'or', 'not', 'True', 'False', 'None'];

  function tokenize(line, lineNo) {
    var toks = [];
    var i = 0, n = line.length;
    while (i < n) {
      var c = line[i];
      if (c === ' ' || c === '\t') { i++; continue; }

      var isF = false;
      if ((c === 'f' || c === 'F') && (line[i + 1] === '"' || line[i + 1] === "'")) { isF = true; i++; c = line[i]; }

      if (c === '"' || c === "'") {
        var quote = c, j = i + 1, buf = '';
        while (j < n && line[j] !== quote) {
          if (line[j] === '\\' && j + 1 < n) { buf += _unescape(line[j + 1]); j += 2; continue; }
          buf += line[j]; j++;
        }
        toks.push({ type: 'STRING', value: buf, fstring: isF });
        i = j + 1;
        continue;
      }
      if (isF) { i--; c = line[i]; } /* 'f' wasn't a string prefix after all */

      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        var start = i, seenDot = false;
        while (i < n && (/[0-9]/.test(line[i]) || (line[i] === '.' && !seenDot && (seenDot = true)))) i++;
        toks.push({ type: 'NUMBER', value: parseFloat(line.slice(start, i)) });
        continue;
      }
      if (/[A-Za-z_฀-๿]/.test(c)) {
        var s2 = i;
        while (i < n && /[A-Za-z0-9_฀-๿]/.test(line[i])) i++;
        var word = line.slice(s2, i);
        toks.push(KEYWORDS.indexOf(word) !== -1 ? { type: 'KEYWORD', value: word } : { type: 'NAME', value: word });
        continue;
      }
      if (c === '{' || c === '}') throw new PyError('บรรทัดที่ ' + lineNo + ': ยังไม่รองรับ dictionary {} ในระบบทดลองนี้');

      var three = line.slice(i, i + 3);
      if (three === '**=') { toks.push({ type: 'OP', value: '**=' }); i += 3; continue; }
      var two = line.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '//', '**', '+=', '-=', '*=', '/='].indexOf(two) !== -1) { toks.push({ type: 'OP', value: two }); i += 2; continue; }
      if ('+-*/%()[],:.<>='.indexOf(c) !== -1) { toks.push({ type: 'OP', value: c }); i++; continue; }
      i++; /* skip unknown char */
    }
    toks.push({ type: 'EOF' });
    return toks;
  }

  /* ─────────────────── statement-level parsing (indent-based) ─────────────────── */
  function parseProgram(code) {
    var rawLines = code.replace(/\r\n/g, '\n').split('\n');
    var lines = [];
    rawLines.forEach(function (raw, idx) {
      var stripped = stripComment(raw);
      var indent = 0, k = 0;
      while (k < stripped.length && (stripped[k] === ' ' || stripped[k] === '\t')) { indent += stripped[k] === '\t' ? 4 : 1; k++; }
      var text = stripped.slice(k).replace(/\s+$/, '');
      if (text.length === 0) return;
      lines.push({ indent: indent, text: text, lineNo: idx + 1 });
    });
    var pos = { i: 0 };
    return parseStatements(lines, pos, 0);
  }

  function parseStatements(lines, pos, indent) {
    var stmts = [];
    while (pos.i < lines.length) {
      var line = lines[pos.i];
      if (line.indent < indent) break;
      if (line.indent > indent) throw new PyError('บรรทัดที่ ' + line.lineNo + ': เยื้องบรรทัด (indent) ไม่ถูกต้อง');
      stmts.push(parseStatement(lines, pos));
    }
    return stmts;
  }

  function findColon(toks, lineNo) {
    for (var i = toks.length - 2; i >= 0; i--) if (toks[i].type === 'OP' && toks[i].value === ':') return i;
    throw new PyError('บรรทัดที่ ' + lineNo + ': คำสั่งนี้ต้องมี : ต่อท้าย');
  }
  function splitByComma(toks) {
    var groups = [], cur = [], depth = 0;
    toks.forEach(function (t) {
      if (t.type === 'OP' && (t.value === '(' || t.value === '[')) depth++;
      if (t.type === 'OP' && (t.value === ')' || t.value === ']')) depth--;
      if (t.type === 'OP' && t.value === ',' && depth === 0) { groups.push(cur); cur = []; return; }
      if (t.type !== 'EOF') cur.push(t);
    });
    if (cur.length) groups.push(cur);
    return groups;
  }
  function childBody(lines, pos, indent) {
    return (pos.i < lines.length && lines[pos.i].indent > indent) ? parseStatements(lines, pos, lines[pos.i].indent) : [];
  }

  function parseStatement(lines, pos) {
    var line = lines[pos.i];
    var toks = tokenize(line.text, line.lineNo);
    var first = toks[0];

    if (first.type === 'KEYWORD') {
      switch (first.value) {
        case 'if': return parseIf(lines, pos);
        case 'for': return parseFor(lines, pos);
        case 'while': return parseWhile(lines, pos);
        case 'def': return parseDef(lines, pos);
        case 'return': {
          pos.i++;
          var exprToks = toks.slice(1, -1);
          return { type: 'Return', expr: exprToks.length ? parseExprTokens(exprToks, line.lineNo) : null, lineNo: line.lineNo };
        }
        case 'break': pos.i++; return { type: 'Break', lineNo: line.lineNo };
        case 'continue': pos.i++; return { type: 'Continue', lineNo: line.lineNo };
        case 'pass': pos.i++; return { type: 'Pass', lineNo: line.lineNo };
        case 'elif': case 'else':
          throw new PyError('บรรทัดที่ ' + line.lineNo + ': พบ ' + first.value + ' โดยไม่มี if นำหน้า');
      }
    }
    pos.i++;
    return parseSimpleLine(toks, line.lineNo);
  }

  function parseIf(lines, pos) {
    var header = lines[pos.i], indent = header.indent;
    var toks = tokenize(header.text, header.lineNo);
    var ci = findColon(toks, header.lineNo);
    var cond = parseExprTokens(toks.slice(1, ci), header.lineNo);
    pos.i++;
    var body = childBody(lines, pos, indent);
    var node = { type: 'If', cond: cond, body: body, elifs: [], elseBody: null, lineNo: header.lineNo };
    while (pos.i < lines.length && lines[pos.i].indent === indent) {
      var t = tokenize(lines[pos.i].text, lines[pos.i].lineNo);
      if (t[0].type === 'KEYWORD' && t[0].value === 'elif') {
        var ci2 = findColon(t, lines[pos.i].lineNo);
        var c2 = parseExprTokens(t.slice(1, ci2), lines[pos.i].lineNo);
        pos.i++;
        node.elifs.push({ cond: c2, body: childBody(lines, pos, indent) });
      } else if (t[0].type === 'KEYWORD' && t[0].value === 'else') {
        pos.i++;
        node.elseBody = childBody(lines, pos, indent);
        break;
      } else break;
    }
    return node;
  }

  function parseFor(lines, pos) {
    var header = lines[pos.i], indent = header.indent;
    var toks = tokenize(header.text, header.lineNo);
    var inIdx = -1;
    for (var k = 1; k < toks.length; k++) if (toks[k].type === 'KEYWORD' && toks[k].value === 'in') { inIdx = k; break; }
    if (inIdx === -1) throw new PyError('บรรทัดที่ ' + header.lineNo + ': for ต้องมี in เช่น for i in range(5):');
    var targets = splitByComma(toks.slice(1, inIdx)).map(function (g) { return g[0].value; });
    var ci = findColon(toks, header.lineNo);
    var iterExpr = parseExprTokens(toks.slice(inIdx + 1, ci), header.lineNo);
    pos.i++;
    var body = childBody(lines, pos, indent);
    return { type: 'For', targets: targets, iter: iterExpr, body: body, lineNo: header.lineNo };
  }

  function parseWhile(lines, pos) {
    var header = lines[pos.i], indent = header.indent;
    var toks = tokenize(header.text, header.lineNo);
    var ci = findColon(toks, header.lineNo);
    var cond = parseExprTokens(toks.slice(1, ci), header.lineNo);
    pos.i++;
    var body = childBody(lines, pos, indent);
    return { type: 'While', cond: cond, body: body, lineNo: header.lineNo };
  }

  function parseDef(lines, pos) {
    var header = lines[pos.i], indent = header.indent;
    var toks = tokenize(header.text, header.lineNo);
    var name = toks[1].value;
    var depth = 0, k = 2, closeIdx = -1;
    for (; k < toks.length; k++) {
      if (toks[k].type === 'OP' && toks[k].value === '(') depth++;
      else if (toks[k].type === 'OP' && toks[k].value === ')') { depth--; if (depth === 0) { closeIdx = k; break; } }
    }
    var paramGroups = splitByComma(toks.slice(3, closeIdx));
    var params = paramGroups.filter(function (g) { return g.length > 0; }).map(function (g) {
      if (g.length >= 3 && g[1].type === 'OP' && g[1].value === '=') {
        return { name: g[0].value, def: parseExprTokens(g.slice(2), header.lineNo) };
      }
      return { name: g[0].value, def: null };
    });
    pos.i++;
    var body = childBody(lines, pos, indent);
    return { type: 'Def', name: name, params: params, body: body, lineNo: header.lineNo };
  }

  function parseSimpleLine(toks, lineNo) {
    var body = toks.slice(0, -1);
    var assignIdx = -1, augOp = null, depth = 0;
    for (var i = 0; i < body.length; i++) {
      var t = body[i];
      if (t.type === 'OP' && (t.value === '(' || t.value === '[')) depth++;
      else if (t.type === 'OP' && (t.value === ')' || t.value === ']')) depth--;
      else if (depth === 0 && t.type === 'OP' && t.value === '=') { assignIdx = i; break; }
      else if (depth === 0 && t.type === 'OP' && /^[+\-*/]=$/.test(t.value)) { assignIdx = i; augOp = t.value[0]; break; }
    }
    if (assignIdx > 0) {
      var targetToks = body.slice(0, assignIdx);
      var valueExpr = parseExprTokens(body.slice(assignIdx + 1), lineNo);
      if (targetToks.length === 1 && targetToks[0].type === 'NAME') {
        return { type: 'Assign', target: targetToks[0].value, augOp: augOp, value: valueExpr, lineNo: lineNo };
      }
      if (targetToks.length >= 4 && targetToks[0].type === 'NAME' && targetToks[1].value === '[') {
        var idxExpr = parseExprTokens(targetToks.slice(2, -1), lineNo);
        return { type: 'IndexAssign', target: targetToks[0].value, index: idxExpr, augOp: augOp, value: valueExpr, lineNo: lineNo };
      }
      throw new PyError('บรรทัดที่ ' + lineNo + ': รูปแบบการกำหนดค่าตัวแปรไม่ถูกต้อง');
    }
    return { type: 'ExprStmt', expr: parseExprTokens(body, lineNo), lineNo: lineNo };
  }

  /* ─────────────────── expression parsing (precedence climbing) ─────────────────── */
  function parseExprTokens(toks, lineNo) {
    if (!toks.length) throw new PyError('บรรทัดที่ ' + lineNo + ': ขาดนิพจน์ที่ต้องใช้');
    var p = { toks: toks.concat([{ type: 'EOF' }]), i: 0, lineNo: lineNo };
    var node = parseOr(p);
    return node;
  }
  function peek(p) { return p.toks[p.i]; }
  function advance(p) { return p.toks[p.i++]; }
  function isOp(t, v) { return !!t && t.type === 'OP' && t.value === v; }
  function isKw(t, v) { return !!t && t.type === 'KEYWORD' && t.value === v; }

  function parseOr(p) {
    var left = parseAnd(p);
    while (isKw(peek(p), 'or')) { advance(p); left = { type: 'BoolOp', op: 'or', left: left, right: parseAnd(p) }; }
    return left;
  }
  function parseAnd(p) {
    var left = parseNot(p);
    while (isKw(peek(p), 'and')) { advance(p); left = { type: 'BoolOp', op: 'and', left: left, right: parseNot(p) }; }
    return left;
  }
  function parseNot(p) {
    if (isKw(peek(p), 'not')) { advance(p); return { type: 'UnaryOp', op: 'not', operand: parseNot(p) }; }
    return parseComparison(p);
  }
  function parseComparison(p) {
    var left = parseArith(p);
    var t = peek(p);
    var cmp = ['==', '!=', '<', '<=', '>', '>='];
    if (t.type === 'OP' && cmp.indexOf(t.value) !== -1) { advance(p); return { type: 'Compare', op: t.value, left: left, right: parseArith(p) }; }
    if (isKw(t, 'in')) { advance(p); return { type: 'Compare', op: 'in', left: left, right: parseArith(p) }; }
    if (isKw(t, 'not') && isKw(p.toks[p.i + 1], 'in')) { advance(p); advance(p); return { type: 'Compare', op: 'not in', left: left, right: parseArith(p) }; }
    return left;
  }
  function parseArith(p) {
    var left = parseTerm(p);
    while (true) {
      var t = peek(p);
      if (t.type === 'OP' && (t.value === '+' || t.value === '-')) { advance(p); left = { type: 'BinOp', op: t.value, left: left, right: parseTerm(p), lineNo: p.lineNo }; }
      else break;
    }
    return left;
  }
  function parseTerm(p) {
    var left = parseFactor(p);
    while (true) {
      var t = peek(p);
      if (t.type === 'OP' && (t.value === '*' || t.value === '/' || t.value === '//' || t.value === '%')) { advance(p); left = { type: 'BinOp', op: t.value, left: left, right: parseFactor(p), lineNo: p.lineNo }; }
      else break;
    }
    return left;
  }
  function parseFactor(p) {
    var t = peek(p);
    if (t.type === 'OP' && (t.value === '-' || t.value === '+')) { advance(p); return { type: 'UnaryOp', op: t.value, operand: parseFactor(p) }; }
    return parsePower(p);
  }
  function parsePower(p) {
    var base = parsePostfix(p);
    var t = peek(p);
    if (t.type === 'OP' && t.value === '**') { advance(p); return { type: 'BinOp', op: '**', left: base, right: parseFactor(p), lineNo: p.lineNo }; }
    return base;
  }
  function parsePostfix(p) {
    var node = parsePrimary(p);
    while (true) {
      var t = peek(p);
      if (isOp(t, '(')) {
        advance(p);
        var args = [], kwargs = {};
        if (!isOp(peek(p), ')')) {
          while (true) {
            if (peek(p).type === 'NAME' && isOp(p.toks[p.i + 1], '=')) {
              var kwname = advance(p).value; advance(p);
              kwargs[kwname] = parseOr(p);
            } else {
              args.push(parseOr(p));
            }
            if (isOp(peek(p), ',')) { advance(p); continue; }
            break;
          }
        }
        if (!isOp(peek(p), ')')) throw new PyError('บรรทัดที่ ' + p.lineNo + ': วงเล็บ ( ไม่ครบคู่');
        advance(p);
        node = { type: 'Call', callee: node, args: args, kwargs: kwargs, lineNo: p.lineNo };
      } else if (isOp(t, '[')) {
        advance(p);
        var idx = parseOr(p);
        if (!isOp(peek(p), ']')) throw new PyError('บรรทัดที่ ' + p.lineNo + ': วงเล็บ [ ไม่ครบคู่');
        advance(p);
        node = { type: 'Index', obj: node, index: idx, lineNo: p.lineNo };
      } else if (isOp(t, '.')) {
        advance(p);
        var attr = advance(p).value;
        node = { type: 'Attr', obj: node, name: attr };
      } else break;
    }
    return node;
  }
  function parsePrimary(p) {
    var t = peek(p);
    if (t.type === 'NUMBER') { advance(p); return { type: 'Num', value: t.value }; }
    if (t.type === 'STRING') { advance(p); return { type: 'Str', value: t.value, fstring: !!t.fstring }; }
    if (isKw(t, 'True')) { advance(p); return { type: 'Bool', value: true }; }
    if (isKw(t, 'False')) { advance(p); return { type: 'Bool', value: false }; }
    if (isKw(t, 'None')) { advance(p); return { type: 'NoneLit' }; }
    if (t.type === 'NAME') { advance(p); return { type: 'Name', name: t.value }; }
    if (isOp(t, '(')) {
      advance(p);
      var e = parseOr(p);
      if (!isOp(peek(p), ')')) throw new PyError('บรรทัดที่ ' + p.lineNo + ': วงเล็บ ( ไม่ครบคู่');
      advance(p);
      return e;
    }
    if (isOp(t, '[')) {
      advance(p);
      var items = [];
      if (!isOp(peek(p), ']')) { while (true) { items.push(parseOr(p)); if (isOp(peek(p), ',')) { advance(p); continue; } break; } }
      if (!isOp(peek(p), ']')) throw new PyError('บรรทัดที่ ' + p.lineNo + ': วงเล็บ [ ไม่ครบคู่');
      advance(p);
      return { type: 'ListLit', items: items };
    }
    throw new PyError('บรรทัดที่ ' + p.lineNo + ': เขียนโค้ดไม่ถูกต้องใกล้ "' + (t.value !== undefined ? t.value : t.type) + '"');
  }

  /* ─────────────────── interpreter ─────────────────── */
  function defaultInput(promptText) {
    if (typeof global.prompt === 'function') return global.prompt(promptText || '');
    return '';
  }

  function Interpreter(opts) {
    this.output = [];
    this.steps = 0;
    this.callDepth = 0;
    this.functions = {};
    this.globals = Object.create(null);
    this.inputFn = (opts && opts.input) || defaultInput;
  }

  Interpreter.prototype.tick = function () {
    this.steps++;
    if (this.steps > MAX_STEPS) throw new PyError('โค้ดทำงานนานเกินไป ⏱️ (อาจมีลูปไม่สิ้นสุด) ลองตรวจสอบเงื่อนไขการหยุดลูปของคุณ');
  };

  Interpreter.prototype.lookup = function (scope, name) {
    if (Object.prototype.hasOwnProperty.call(scope, name)) return scope[name];
    if (scope !== this.globals && Object.prototype.hasOwnProperty.call(this.globals, name)) return this.globals[name];
    throw new PyError('ยังไม่ได้กำหนดค่าตัวแปรชื่อ "' + name + '"');
  };

  Interpreter.prototype.truthy = function (v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  };

  Interpreter.prototype.pyEq = function (a, b) {
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every(function (v, i) { return v === b[i]; });
    return a === b;
  };
  Interpreter.prototype.containsCheck = function (needle, hay) {
    if (typeof hay === 'string') return hay.indexOf(needle) !== -1;
    if (Array.isArray(hay)) return hay.some(function (x) { return x === needle; });
    throw new PyError('ใช้ in ได้เฉพาะกับ string หรือ list เท่านั้น');
  };
  Interpreter.prototype.compare = function (op, a, b) {
    switch (op) {
      case '==': return this.pyEq(a, b);
      case '!=': return !this.pyEq(a, b);
      case '<': return a < b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '>=': return a >= b;
      case 'in': return this.containsCheck(a, b);
      case 'not in': return !this.containsCheck(a, b);
    }
  };
  Interpreter.prototype.applyBinOp = function (op, a, b, lineNo) {
    if (op === '+') {
      if (typeof a === 'string' || typeof b === 'string') {
        if (typeof a !== 'string' || typeof b !== 'string') throw new PyError('บรรทัดที่ ' + lineNo + ': บวกข้อความกับตัวเลขโดยตรงไม่ได้ — ลองใช้ f-string เช่น f"อายุ {age}"');
        return a + b;
      }
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      return a + b;
    }
    if (op === '-') return a - b;
    if (op === '*') {
      if (typeof a === 'string' && typeof b === 'number') return a.repeat(Math.max(0, Math.floor(b)));
      if (typeof b === 'string' && typeof a === 'number') return b.repeat(Math.max(0, Math.floor(a)));
      return a * b;
    }
    if (op === '/') { if (b === 0) throw new PyError('บรรทัดที่ ' + lineNo + ': หารด้วยศูนย์ไม่ได้ (ZeroDivisionError)'); return a / b; }
    if (op === '//') { if (b === 0) throw new PyError('บรรทัดที่ ' + lineNo + ': หารด้วยศูนย์ไม่ได้ (ZeroDivisionError)'); return Math.floor(a / b); }
    if (op === '%') { if (b === 0) throw new PyError('บรรทัดที่ ' + lineNo + ': หารด้วยศูนย์ไม่ได้ (ZeroDivisionError)'); return ((a % b) + b) % b; }
    if (op === '**') return Math.pow(a, b);
    throw new PyError('ไม่รองรับตัวดำเนินการ: ' + op);
  };
  Interpreter.prototype._normIdx = function (obj, idx) {
    var len = obj.length, i = Math.trunc(idx);
    if (i < 0) i += len;
    return i;
  };
  Interpreter.prototype.getIndex = function (obj, idx) {
    if (typeof obj === 'string' || Array.isArray(obj)) return obj[this._normIdx(obj, idx)];
    throw new PyError('ไม่สามารถเข้าถึงดัชนี [] ของค่านี้ได้');
  };
  Interpreter.prototype.toIterable = function (obj, lineNo) {
    if (Array.isArray(obj)) return obj;
    if (typeof obj === 'string') return obj.split('');
    throw new PyError('บรรทัดที่ ' + lineNo + ': ใช้ for...in ได้กับ list, string, range() หรือ enumerate() เท่านั้น');
  };
  Interpreter.prototype.callMethod = function (obj, name, args, lineNo) {
    if (typeof obj === 'string') {
      switch (name) {
        case 'lower': return obj.toLowerCase();
        case 'upper': return obj.toUpperCase();
        case 'strip': return obj.trim();
        case 'title': return obj.replace(/\S+/g, function (t) { return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); });
        case 'replace': return obj.split(pyStr(args[0])).join(pyStr(args[1]));
        case 'split': return args.length ? obj.split(pyStr(args[0])) : obj.split(/\s+/).filter(Boolean);
        case 'startswith': return obj.indexOf(pyStr(args[0])) === 0;
        case 'endswith': return obj.slice(-pyStr(args[0]).length) === pyStr(args[0]);
      }
    }
    if (Array.isArray(obj)) {
      switch (name) {
        case 'append': obj.push(args[0]); return null;
        case 'pop': return obj.length ? obj.pop() : (function () { throw new PyError('บรรทัดที่ ' + lineNo + ': pop() จาก list ว่างไม่ได้'); })();
        case 'count': return obj.filter(function (x) { return x === args[0]; }).length;
        case 'index': return obj.indexOf(args[0]);
        case 'sort': obj.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; }); return null;
        case 'reverse': obj.reverse(); return null;
      }
    }
    throw new PyError('บรรทัดที่ ' + lineNo + ': ไม่รองรับเมธอด .' + name + '()');
  };

  Interpreter.prototype._topLevelColon = function (s) {
    var depth = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === ':' && depth === 0) return i;
    }
    return -1;
  };
  Interpreter.prototype._formatValue = function (val, spec) {
    if (!spec) return pyStr(val);
    var m = spec.match(/^\.(\d+)f$/);
    if (m && typeof val === 'number') return val.toFixed(parseInt(m[1], 10));
    return pyStr(val);
  };
  Interpreter.prototype.evalFString = function (str, scope) {
    var out = '', i = 0, n = str.length;
    while (i < n) {
      var c = str[i];
      if (c === '{' && str[i + 1] === '{') { out += '{'; i += 2; continue; }
      if (c === '}' && str[i + 1] === '}') { out += '}'; i += 2; continue; }
      if (c === '{') {
        var depth = 1, j = i + 1;
        while (j < n && depth > 0) { if (str[j] === '{') depth++; else if (str[j] === '}') depth--; if (depth > 0) j++; }
        var inner = str.slice(i + 1, j);
        var colonIdx = this._topLevelColon(inner);
        var exprPart = colonIdx === -1 ? inner : inner.slice(0, colonIdx);
        var spec = colonIdx === -1 ? '' : inner.slice(colonIdx + 1);
        var toks = tokenize(exprPart, 0);
        var val = this.evalExpr(parseExprTokens(toks.slice(0, -1), 0), scope);
        out += this._formatValue(val, spec);
        i = j + 1;
        continue;
      }
      out += c; i++;
    }
    return out;
  };

  Interpreter.prototype.evalExpr = function (node, scope) {
    switch (node.type) {
      case 'Num': return node.value;
      case 'Str': return node.fstring ? this.evalFString(node.value, scope) : node.value;
      case 'Bool': return node.value;
      case 'NoneLit': return null;
      case 'Name': return this.lookup(scope, node.name);
      case 'ListLit': { var self = this; return node.items.map(function (it) { return self.evalExpr(it, scope); }); }
      case 'UnaryOp': {
        if (node.op === 'not') return !this.truthy(this.evalExpr(node.operand, scope));
        var v = this.evalExpr(node.operand, scope);
        return node.op === '-' ? -v : +v;
      }
      case 'BoolOp': {
        var l = this.evalExpr(node.left, scope);
        if (node.op === 'and') return this.truthy(l) ? this.evalExpr(node.right, scope) : l;
        return this.truthy(l) ? l : this.evalExpr(node.right, scope);
      }
      case 'Compare': return this.compare(node.op, this.evalExpr(node.left, scope), this.evalExpr(node.right, scope));
      case 'BinOp': return this.applyBinOp(node.op, this.evalExpr(node.left, scope), this.evalExpr(node.right, scope), node.lineNo);
      case 'Index': return this.getIndex(this.evalExpr(node.obj, scope), this.evalExpr(node.index, scope));
      case 'Attr': throw new PyError('ไม่รองรับการเข้าถึง .' + node.name + ' โดยไม่เรียกเป็นเมธอด');
      case 'Call': return this.evalCall(node, scope);
      default: throw new PyError('นิพจน์ไม่รองรับ: ' + node.type);
    }
  };

  Interpreter.prototype.evalCall = function (node, scope) {
    var self = this;
    var callee = node.callee;
    if (callee.type === 'Attr') {
      var obj = this.evalExpr(callee.obj, scope);
      var margs = node.args.map(function (a) { return self.evalExpr(a, scope); });
      return this.callMethod(obj, callee.name, margs, node.lineNo);
    }
    if (callee.type !== 'Name') throw new PyError('บรรทัดที่ ' + node.lineNo + ': เรียกใช้สิ่งที่ไม่ใช่ฟังก์ชันไม่ได้');
    var fname = callee.name;
    var args = node.args.map(function (a) { return self.evalExpr(a, scope); });
    var kwargs = {};
    Object.keys(node.kwargs).forEach(function (k) { kwargs[k] = self.evalExpr(node.kwargs[k], scope); });

    if (Object.prototype.hasOwnProperty.call(BUILTINS, fname)) return BUILTINS[fname].call(this, args, kwargs, node.lineNo);

    var fn = this.functions[fname];
    if (!fn) throw new PyError('บรรทัดที่ ' + node.lineNo + ': ไม่พบฟังก์ชันหรือคำสั่งชื่อ "' + fname + '()"');
    return this.callUserFunction(fn, args, kwargs);
  };

  Interpreter.prototype.callUserFunction = function (fn, args, kwargs) {
    this.callDepth++;
    if (this.callDepth > MAX_CALL_DEPTH) { this.callDepth--; throw new PyError('เรียกฟังก์ชันซ้อนกันลึกเกินไป (อาจเป็น recursion ไม่สิ้นสุด)'); }
    var self = this;
    var localScope = Object.create(null);
    fn.params.forEach(function (param, i) {
      if (i < args.length) localScope[param.name] = args[i];
      else if (Object.prototype.hasOwnProperty.call(kwargs, param.name)) localScope[param.name] = kwargs[param.name];
      else if (param.def) localScope[param.name] = self.evalExpr(param.def, self.globals);
      else localScope[param.name] = null;
    });
    try {
      this.execBlock(fn.body, localScope);
      return null;
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    } finally {
      this.callDepth--;
    }
  };

  Interpreter.prototype.execBlock = function (stmts, scope) {
    for (var i = 0; i < stmts.length; i++) this.execStmt(stmts[i], scope);
  };

  Interpreter.prototype.execStmt = function (node, scope) {
    this.tick();
    switch (node.type) {
      case 'Assign': {
        var val = this.evalExpr(node.value, scope);
        if (node.augOp) val = this.applyBinOp(node.augOp, this.lookup(scope, node.target), val, node.lineNo);
        scope[node.target] = val;
        break;
      }
      case 'IndexAssign': {
        var target = this.lookup(scope, node.target);
        if (!Array.isArray(target)) throw new PyError('บรรทัดที่ ' + node.lineNo + ': กำหนดค่าผ่าน [] ได้เฉพาะ list');
        var idx = this._normIdx(target, this.evalExpr(node.index, scope));
        var val2 = this.evalExpr(node.value, scope);
        if (node.augOp) val2 = this.applyBinOp(node.augOp, target[idx], val2, node.lineNo);
        target[idx] = val2;
        break;
      }
      case 'ExprStmt': this.evalExpr(node.expr, scope); break;
      case 'If': {
        if (this.truthy(this.evalExpr(node.cond, scope))) { this.execBlock(node.body, scope); break; }
        for (var i = 0; i < node.elifs.length; i++) {
          if (this.truthy(this.evalExpr(node.elifs[i].cond, scope))) { this.execBlock(node.elifs[i].body, scope); return; }
        }
        if (node.elseBody) this.execBlock(node.elseBody, scope);
        break;
      }
      case 'For': {
        var iterable = this.evalExpr(node.iter, scope);
        var items = this.toIterable(iterable, node.lineNo);
        for (var k = 0; k < items.length; k++) {
          this.tick();
          if (node.targets.length === 1) scope[node.targets[0]] = items[k];
          else {
            var tup = items[k];
            if (!Array.isArray(tup)) throw new PyError('บรรทัดที่ ' + node.lineNo + ': ไม่สามารถแยกค่าตามจำนวนตัวแปรได้');
            for (var ti = 0; ti < node.targets.length; ti++) scope[node.targets[ti]] = tup[ti];
          }
          try { this.execBlock(node.body, scope); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        break;
      }
      case 'While': {
        while (this.truthy(this.evalExpr(node.cond, scope))) {
          this.tick();
          try { this.execBlock(node.body, scope); }
          catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
        }
        break;
      }
      case 'Def': this.functions[node.name] = node; break;
      case 'Return': throw new ReturnSignal(node.expr ? this.evalExpr(node.expr, scope) : null);
      case 'Break': throw new BreakSignal();
      case 'Continue': throw new ContinueSignal();
      case 'Pass': break;
      default: throw new PyError('คำสั่งไม่รองรับ: ' + node.type);
    }
  };

  Interpreter.prototype.run = function (code) {
    try {
      var program = parseProgram(code);
      this.execBlock(program, this.globals);
      return { output: this.output, error: null };
    } catch (e) {
      if (e instanceof StopSignal) return { output: this.output, error: null };
      if (e && e.isPyError) return { output: this.output, error: e.message };
      if (e instanceof BreakSignal || e instanceof ContinueSignal) return { output: this.output, error: 'พบ break/continue อยู่นอก loop' };
      return { output: this.output, error: 'เกิดข้อผิดพลาด: ' + (e && e.message ? e.message : String(e)) };
    }
  };

  /* ─────────────────── built-in functions ─────────────────── */
  var BUILTINS = {
    print: function (args) {
      var line = args.map(function (v) { return pyStr(v); }).join(' ');
      this.output.push(line);
      if (this.output.length > MAX_OUTPUT_LINES) {
        this.output.push('… (ผลลัพธ์ยาวเกินไป หยุดแสดงผลบางส่วน)');
        throw new StopSignal();
      }
      return null;
    },
    range: function (args) {
      var start = 0, stop, step = 1;
      if (args.length === 1) stop = args[0];
      else if (args.length === 2) { start = args[0]; stop = args[1]; }
      else if (args.length >= 3) { start = args[0]; stop = args[1]; step = args[2]; }
      else throw new PyError('range() ต้องการอย่างน้อย 1 ค่า');
      if (step === 0) throw new PyError('range() step ต้องไม่เป็น 0');
      var out = [];
      if (step > 0) for (var i = start; i < stop; i += step) out.push(i);
      else for (var i2 = start; i2 > stop; i2 += step) out.push(i2);
      return out;
    },
    len: function (args) {
      var v = args[0];
      if (typeof v === 'string' || Array.isArray(v)) return v.length;
      throw new PyError('len() ใช้ได้กับ string หรือ list เท่านั้น');
    },
    int: function (args) {
      var v = args[0], n = typeof v === 'string' ? parseInt(v.trim(), 10) : Math.trunc(v);
      if (isNaN(n)) throw new PyError('แปลงเป็นจำนวนเต็มไม่ได้: "' + v + '"');
      return n;
    },
    float: function (args) {
      var v = args[0], n = typeof v === 'string' ? parseFloat(v.trim()) : v;
      if (isNaN(n)) throw new PyError('แปลงเป็นทศนิยมไม่ได้: "' + v + '"');
      return n;
    },
    str: function (args) { return pyStr(args[0]); },
    bool: function (args) { return this.truthy(args[0]); },
    abs: function (args) { return Math.abs(args[0]); },
    round: function (args) { var v = args[0], nd = args.length > 1 ? args[1] : 0, f = Math.pow(10, nd); return Math.round(v * f) / f; },
    max: function (args) { var l = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args; return Math.max.apply(null, l); },
    min: function (args) { var l = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args; return Math.min.apply(null, l); },
    sum: function (args) { var l = args[0]; if (!Array.isArray(l)) throw new PyError('sum() ต้องการ list'); return l.reduce(function (a, b) { return a + b; }, 0); },
    list: function (args) { var v = args[0]; if (Array.isArray(v)) return v.slice(); if (typeof v === 'string') return v.split(''); return []; },
    enumerate: function (args) {
      var l = args[0], start = args.length > 1 ? args[1] : 0;
      if (!Array.isArray(l)) throw new PyError('enumerate() ใช้กับ list เท่านั้น');
      return l.map(function (v, i) { return [i + start, v]; });
    },
    input: function (args) {
      var promptText = args.length ? pyStr(args[0]) : '';
      var val = this.inputFn(promptText);
      if (val === null || val === undefined) throw new StopSignal();
      return String(val);
    }
  };

  /* ─────────────────── public API ─────────────────── */
  var PyMini = {
    run: function (code, opts) {
      var interp = new Interpreter(opts || {});
      return interp.run(code == null ? '' : code);
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PyMini;
  global.PyMini = PyMini;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
