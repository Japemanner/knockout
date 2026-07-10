# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: decimal-helper.spec.ts >> parseDecimalInput >> wijst enkele punt of komma af
- Location: tests\e2e\decimal-helper.spec.ts:156:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Test source

```ts
  57  |   test('string met komma wordt punt', () => {
  58  |     expect(normalizeForDisplay('1,5')).toBe('1.5')
  59  |     expect(normalizeForDisplay('1.5')).toBe('1.5')
  60  |   })
  61  | })
  62  | 
  63  | test.describe('parseDecimalInput', () => {
  64  |   test('accepteert punt als decimaal scheidingsteken', () => {
  65  |     const result = parseDecimalInput('1.5', true)
  66  |     expect(result.ok).toBe(true)
  67  |     if (result.ok) expect(result.value).toBe(1.5)
  68  |   })
  69  | 
  70  |   test('accepteert komma als decimaal scheidingsteken en normaliseert naar punt', () => {
  71  |     const result = parseDecimalInput('1,5', true)
  72  |     expect(result.ok).toBe(true)
  73  |     if (result.ok) expect(result.value).toBe(1.5)
  74  |   })
  75  | 
  76  |   test('accepteert negatieve waarden met punt en komma', () => {
  77  |     const r1 = parseDecimalInput('-1.5', true)
  78  |     expect(r1.ok).toBe(true)
  79  |     if (r1.ok) expect(r1.value).toBe(-1.5)
  80  | 
  81  |     const r2 = parseDecimalInput('-1,5', true)
  82  |     expect(r2.ok).toBe(true)
  83  |     if (r2.ok) expect(r2.value).toBe(-1.5)
  84  |   })
  85  | 
  86  |   test('accepteert gehele getallen', () => {
  87  |     const result = parseDecimalInput('42', true)
  88  |     expect(result.ok).toBe(true)
  89  |     if (result.ok) expect(result.value).toBe(42)
  90  |   })
  91  | 
  92  |   test('accepteert leidende nul', () => {
  93  |     const r1 = parseDecimalInput('0.5', true)
  94  |     expect(r1.ok).toBe(true)
  95  |     if (r1.ok) expect(r1.value).toBe(0.5)
  96  | 
  97  |     const r2 = parseDecimalInput('0,5', true)
  98  |     expect(r2.ok).toBe(true)
  99  |     if (r2.ok) expect(r2.value).toBe(0.5)
  100 |   })
  101 | 
  102 |   test('leeg + nullable => null', () => {
  103 |     const result = parseDecimalInput('', true)
  104 |     expect(result.ok).toBe(true)
  105 |     if (result.ok) expect(result.value).toBeNull()
  106 |   })
  107 | 
  108 |   test('leeg + niet-nullable => fout', () => {
  109 |     const result = parseDecimalInput('', false)
  110 |     expect(result.ok).toBe(false)
  111 |     if (!result.ok) expect(result.error).toBe('Dit veld is verplicht')
  112 |   })
  113 | 
  114 |   test('whitespace-only + nullable => null', () => {
  115 |     const result = parseDecimalInput('   ', true)
  116 |     expect(result.ok).toBe(true)
  117 |     if (result.ok) expect(result.value).toBeNull()
  118 |   })
  119 | 
  120 |   test('wijst meerdere punten af', () => {
  121 |     const result = parseDecimalInput('1..5', true)
  122 |     expect(result.ok).toBe(false)
  123 |     if (!result.ok) expect(result.error).toBe('Ongeldige decimale waarde')
  124 |   })
  125 | 
  126 |   test('wijst meerdere komma\'s af', () => {
  127 |     const result = parseDecimalInput('1,,5', true)
  128 |     expect(result.ok).toBe(false)
  129 |     if (!result.ok) expect(result.error).toBe('Ongeldige decimale waarde')
  130 |   })
  131 | 
  132 |   test('wijst gemengde scheidingstekens af', () => {
  133 |     const r1 = parseDecimalInput('1,5.0', true)
  134 |     expect(r1.ok).toBe(false)
  135 | 
  136 |     const r2 = parseDecimalInput('1.5,0', true)
  137 |     expect(r2.ok).toBe(false)
  138 |   })
  139 | 
  140 |   test('wijst duizendtals-scheidingstekens af', () => {
  141 |     const r1 = parseDecimalInput('1.234,56', true)
  142 |     expect(r1.ok).toBe(false)
  143 | 
  144 |     const r2 = parseDecimalInput('1,234.56', true)
  145 |     expect(r2.ok).toBe(false)
  146 |   })
  147 | 
  148 |   test('wijst letters af', () => {
  149 |     const r1 = parseDecimalInput('1abc', true)
  150 |     expect(r1.ok).toBe(false)
  151 | 
  152 |     const r2 = parseDecimalInput('abc', true)
  153 |     expect(r2.ok).toBe(false)
  154 |   })
  155 | 
  156 |   test('wijst enkele punt of komma af', () => {
> 157 |     expect(parseDecimalInput('.', true).ok).toBe(false)
      |                                             ^ Error: expect(received).toBe(expected) // Object.is equality
  158 |     expect(parseDecimalInput(',', true).ok).toBe(false)
  159 |   })
  160 | 
  161 |   test('trimt whitespace rondom geldige invoer', () => {
  162 |     const result = parseDecimalInput('  1.5  ', true)
  163 |     expect(result.ok).toBe(true)
  164 |     if (result.ok) expect(result.value).toBe(1.5)
  165 |   })
  166 | })
  167 | 
  168 | test.describe('parseIntegerInput', () => {
  169 |   test('accepteert gehele getallen', () => {
  170 |     const r1 = parseIntegerInput('42', true)
  171 |     expect(r1.ok).toBe(true)
  172 |     if (r1.ok) expect(r1.value).toBe(42)
  173 | 
  174 |     const r2 = parseIntegerInput('0', true)
  175 |     expect(r2.ok).toBe(true)
  176 |     if (r2.ok) expect(r2.value).toBe(0)
  177 |   })
  178 | 
  179 |   test('accepteert negatieve gehele getallen', () => {
  180 |     const result = parseIntegerInput('-42', true)
  181 |     expect(result.ok).toBe(true)
  182 |     if (result.ok) expect(result.value).toBe(-42)
  183 |   })
  184 | 
  185 |   test('wijst punt af met specifieke foutmelding', () => {
  186 |     const result = parseIntegerInput('1.5', true)
  187 |     expect(result.ok).toBe(false)
  188 |     if (!result.ok) expect(result.error).toBe('Gehele getallen toegestaan — geen decimale scheidingsteken')
  189 |   })
  190 | 
  191 |   test('wijst komma af met specifieke foutmelding', () => {
  192 |     const result = parseIntegerInput('1,5', true)
  193 |     expect(result.ok).toBe(false)
  194 |     if (!result.ok) expect(result.error).toBe('Gehele getallen toegestaan — geen decimale scheidingsteken')
  195 |   })
  196 | 
  197 |   test('wijst 1.0 af (zelfs als numeriek gelijk aan integer)', () => {
  198 |     const result = parseIntegerInput('1.0', true)
  199 |     expect(result.ok).toBe(false)
  200 |   })
  201 | 
  202 |   test('wijst letters af', () => {
  203 |     const result = parseIntegerInput('42abc', true)
  204 |     expect(result.ok).toBe(false)
  205 |     if (!result.ok) expect(result.error).toBe('Ongeldig geheel getal')
  206 |   })
  207 | 
  208 |   test('leeg + nullable => null', () => {
  209 |     const result = parseIntegerInput('', true)
  210 |     expect(result.ok).toBe(true)
  211 |     if (result.ok) expect(result.value).toBeNull()
  212 |   })
  213 | 
  214 |   test('leeg + niet-nullable => fout', () => {
  215 |     const result = parseIntegerInput('', false)
  216 |     expect(result.ok).toBe(false)
  217 |     if (!result.ok) expect(result.error).toBe('Dit veld is verplicht')
  218 |   })
  219 | })
```